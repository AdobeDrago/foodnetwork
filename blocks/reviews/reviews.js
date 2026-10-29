import { recipePath } from '../../scripts/recipe-data.js';

const FOOD_ORIGIN = 'https://www.foodnetwork.com';
const RATING_RE = /(\d+(?:\.\d+)?)\s*(?:of|out of|\/)\s*5(?:\s*stars?)?/i;
const INITIAL_VISIBLE = 10;

let listCount = 0;

function parseRating(text) {
  const match = (text || '').match(RATING_RE);
  if (!match) return null;
  return {
    value: Math.max(0, Math.min(5, parseFloat(match[1]))),
    rest: text.replace(match[0], ''),
  };
}

/**
 * Five-star meter, rounded up to the nearest half star as the source does
 * (4.1 -> 4.5, 4.6 -> 5), matching cards-recipe and columns-recipe-body.
 * @param {number} value
 * @returns {HTMLElement}
 */
function starMeter(value) {
  const stars = document.createElement('span');
  stars.className = 'reviews-stars';
  stars.setAttribute('role', 'img');
  stars.setAttribute('aria-label', `${value} of 5 stars`);
  const shown = Math.ceil(value * 2) / 2;
  for (let i = 1; i <= 5; i += 1) {
    const star = document.createElement('span');
    let state = 'empty';
    if (shown >= i) state = 'full';
    else if (shown >= i - 0.5) state = 'half';
    star.className = `reviews-star reviews-star-${state}`;
    stars.append(star);
  }
  return stars;
}

function leaveReviewHref(authoredHref) {
  const path = recipePath();
  if (path) return `${FOOD_ORIGIN}${path}#reviewsTop`;
  if (!authoredHref) {
    // recipe pages without the "-recipe-<id>" slug, or previewed under /content/
    const local = window.location.pathname
      .replace(/^\/content(?=\/)/, '')
      .replace(/\.html$/, '')
      .replace(/\/+$/, '');
    return /^\/recipes\/.+/.test(local) ? `${FOOD_ORIGIN}${local}#reviewsTop` : '';
  }
  return authoredHref.includes('#') ? authoredHref : `${authoredHref}#reviewsTop`;
}

function buildHeader(summaryCell) {
  const header = document.createElement('div');
  header.className = 'reviews-header';
  if (!document.getElementById('reviewsTop')) header.id = 'reviewsTop';

  const text = summaryCell?.textContent.trim().replace(/\s+/g, ' ') || '';
  const rating = parseRating(text);
  const summary = document.createElement('div');
  summary.className = 'reviews-summary';

  const count = document.createElement('h2');
  count.className = 'reviews-count';
  if (rating) {
    summary.append(starMeter(rating.value));
    const countMatch = rating.rest.match(/\d[\d,]*/);
    if (countMatch) {
      const [countText] = countMatch;
      count.textContent = `${countText} ${countText === '1' ? 'Review' : 'Reviews'}`;
    } else {
      count.textContent = 'Reviews';
    }
  } else {
    count.textContent = text || 'Reviews';
  }
  summary.append(count);
  header.append(summary);

  const href = leaveReviewHref(summaryCell?.querySelector('a[href]')?.getAttribute('href') || '');
  if (href) {
    const leave = document.createElement('a');
    leave.className = 'reviews-leave';
    leave.href = href;
    leave.textContent = 'Leave a review';
    header.append(leave);
  }
  return header;
}

function dateElement(text) {
  const time = document.createElement('time');
  time.className = 'reviews-date';
  time.textContent = text;
  const parsed = new Date(text);
  if (text && !Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    time.dateTime = `${yyyy}-${mm}-${dd}`;
  }
  return time;
}

function reviewItem(cells) {
  const [authorCell, dateCell, ratingCell, textCell] = cells;
  const author = authorCell?.textContent.trim() || '';
  const date = dateCell?.textContent.trim() || '';

  const li = document.createElement('li');
  li.className = 'reviews-item';

  const avatar = document.createElement('span');
  avatar.className = 'reviews-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = (author.match(/[\p{L}\p{N}]/u)?.[0] || '?').toUpperCase();
  li.append(avatar);

  const body = document.createElement('div');
  body.className = 'reviews-body';

  const meta = document.createElement('p');
  meta.className = 'reviews-meta';
  const name = document.createElement('span');
  name.className = 'reviews-author';
  name.textContent = author;
  meta.append(name);
  if (date) meta.append(dateElement(date));
  body.append(meta);

  const rating = parseRating(ratingCell?.textContent.trim() || '');
  if (rating) {
    const ratingWrap = document.createElement('div');
    ratingWrap.className = 'reviews-rating';
    ratingWrap.append(starMeter(rating.value));
    body.append(ratingWrap);
  }

  const text = document.createElement('div');
  text.className = 'reviews-text';
  if (textCell) {
    if (textCell.firstElementChild) {
      while (textCell.firstChild) text.append(textCell.firstChild);
    } else if (textCell.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = textCell.textContent.trim();
      text.append(p);
    }
  }
  body.append(text);
  li.append(body);
  return li;
}

function addShowMore(block, list) {
  const items = [...list.children];
  if (items.length <= INITIAL_VISIBLE) return;
  listCount += 1;
  list.id = list.id || `reviews-list-${listCount}`;
  items.slice(INITIAL_VISIBLE).forEach((li) => { li.hidden = true; });

  const footer = document.createElement('div');
  footer.className = 'reviews-footer';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'reviews-more';
  button.textContent = 'Show more reviews';
  button.setAttribute('aria-controls', list.id);
  button.setAttribute('aria-expanded', 'false');
  footer.append(button);
  block.append(footer);

  button.addEventListener('click', () => {
    const hidden = [...list.querySelectorAll(':scope > li[hidden]')];
    hidden.forEach((li) => { li.hidden = false; });
    footer.remove();
    if (hidden[0]) {
      hidden[0].tabIndex = -1;
      hidden[0].focus();
    }
  });
}

/**
 * Reviews block
 * Row 1: summary cell "4.1 of 5 stars (79 reviews)" (+ optional link).
 * Then one row per review: author | date | rating text (may be empty) | review text.
 * Shows the first 10 reviews (as on the source); "Show more reviews" reveals the rest.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const first = rows[0];
  const firstCells = first ? [...first.children] : [];
  // the summary row is a single cell; tolerate a short row that reads "x of 5 stars (n reviews)"
  const looksLikeSummary = !!first && !!parseRating(first.textContent)
    && /review/i.test(first.textContent) && firstCells.length < 4;
  const hasSummary = !!first && (firstCells.length < 2 || looksLikeSummary);
  const summaryRow = hasSummary ? rows.shift() : null;

  const header = buildHeader(summaryRow?.firstElementChild || null);

  const list = document.createElement('ul');
  list.className = 'reviews-list';
  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.some((cell) => cell.textContent.trim())) return;
    list.append(reviewItem(cells));
  });

  block.replaceChildren(header);
  if (list.children.length) {
    block.append(list);
    addShowMore(block, list);
  } else {
    block.classList.add('reviews-empty');
  }
}
