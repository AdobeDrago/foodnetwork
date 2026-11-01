import { recipePath } from '../../scripts/recipe-data.js';

const FOOD_ORIGIN = 'https://www.foodnetwork.com';
const RATING_RE = /(\d+(?:\.\d+)?)\s*(?:of|out of|\/)\s*5(?:\s*stars?)?/i;
const INITIAL_VISIBLE = 10;

const DEFAULT_LABELS = {
  emptyHeading: 'Be the first to review',
  placeholder: 'Did you make this recipe? Leave a review! (required)',
  ratingLabel: 'Your Rating:',
  button: 'Post Review',
};

// first cell of an optional 2-cell label row (case-insensitive, trailing colon ignored)
const LABEL_KEYS = {
  'empty heading': 'emptyHeading',
  placeholder: 'placeholder',
  'rating label': 'ratingLabel',
  button: 'button',
};

let listCount = 0;
let composeCount = 0;

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

/**
 * Review count stated in the summary text ("4.1 of 5 stars (79 reviews)", "0 reviews").
 * @param {string} text
 * @returns {number|null}
 */
function summaryCount(text) {
  const rating = parseRating(text);
  const match = (rating ? rating.rest : text).match(/(\d[\d,]*)\s*reviews?\b/i)
    || (rating ? rating.rest.match(/\d[\d,]*/) : null);
  if (!match) return null;
  return parseInt((match[1] || match[0]).replace(/,/g, ''), 10);
}

/**
 * Optional 2-cell label rows ("Empty heading" | "Be the first to review", ...).
 * Review rows have 4 cells, so they are never matched here.
 * @param {Element[]} rows
 * @returns {{ labels: Object<string, string>, rest: Element[] }}
 */
function extractLabelRows(rows) {
  const labels = { ...DEFAULT_LABELS };
  const rest = rows.filter((row) => {
    const cells = [...row.children];
    if (cells.length !== 2) return true;
    const key = cells[0].textContent.trim().replace(/\s+/g, ' ').replace(/:$/, '').toLowerCase();
    const name = LABEL_KEYS[key];
    if (!name) return true;
    const value = cells[1].textContent.trim().replace(/\s+/g, ' ');
    if (value) labels[name] = value;
    return false;
  });
  return { labels, rest };
}

function buildHeader(summaryCell, emptyHeading) {
  const header = document.createElement('div');
  header.className = 'reviews-header';
  if (!document.getElementById('reviewsTop')) header.id = 'reviewsTop';

  const text = summaryCell?.textContent.trim().replace(/\s+/g, ' ') || '';
  const rating = parseRating(text);
  const summary = document.createElement('div');
  summary.className = 'reviews-summary';

  const count = document.createElement('h2');
  count.className = 'reviews-count';
  if (emptyHeading) {
    count.textContent = emptyHeading;
  } else if (rating) {
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
  return header;
}

/**
 * Five-star rating input: native radios (arrow keys / space) styled as stars.
 * @param {string} uid
 * @param {string} labelText
 * @returns {HTMLElement}
 */
function ratingInput(uid, labelText) {
  const wrap = document.createElement('div');
  wrap.className = 'reviews-compose-rating';

  const title = document.createElement('span');
  title.className = 'reviews-compose-rating-label';
  title.id = `${uid}-rating-label`;
  title.textContent = labelText;
  wrap.append(title);

  const stars = document.createElement('div');
  stars.className = 'reviews-compose-stars';
  stars.setAttribute('role', 'radiogroup');
  stars.setAttribute('aria-labelledby', title.id);
  for (let i = 1; i <= 5; i += 1) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${uid}-rating`;
    input.id = `${uid}-rating-${i}`;
    input.value = String(i);
    input.className = 'reviews-compose-star-input';
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.className = 'reviews-compose-star';
    label.dataset.value = String(i);
    const sr = document.createElement('span');
    sr.className = 'reviews-sr-only';
    sr.textContent = `${i} ${i === 1 ? 'star' : 'stars'}`;
    label.append(sr);
    stars.append(input, label);
  }
  wrap.append(stars);

  const labels = [...stars.querySelectorAll('.reviews-compose-star')];
  const paint = (value) => {
    labels.forEach((label, index) => label.classList.toggle('is-on', index < value));
  };
  const checkedValue = () => Number(stars.querySelector('input:checked')?.value || 0);
  stars.addEventListener('mouseover', (e) => {
    const star = e.target.closest('.reviews-compose-star');
    if (star) paint(Number(star.dataset.value));
  });
  stars.addEventListener('mouseleave', () => paint(checkedValue()));
  stars.addEventListener('change', () => paint(checkedValue()));
  return wrap;
}

/**
 * Compose box (source #user-review): avatar, textarea, Your Rating stars, Post Review.
 * There is no review backend: Post Review validates the text, then opens the
 * recipe's review section on foodnetwork.com in a new tab to sign in and post.
 * @param {Object<string, string>} labels
 * @param {string} authoredHref
 * @returns {HTMLFormElement}
 */
function buildCompose(labels, authoredHref) {
  composeCount += 1;
  const uid = `reviews-compose-${composeCount}`;

  const form = document.createElement('form');
  form.className = 'reviews-compose';
  form.noValidate = true;
  form.setAttribute('aria-label', 'Write a review');

  const avatar = document.createElement('span');
  avatar.className = 'reviews-compose-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  form.append(avatar);

  const body = document.createElement('div');
  body.className = 'reviews-compose-body';

  const label = document.createElement('label');
  label.className = 'reviews-sr-only';
  label.htmlFor = `${uid}-text`;
  label.textContent = 'Your review (required)';

  const editor = document.createElement('div');
  editor.className = 'reviews-compose-editor';
  const textarea = document.createElement('textarea');
  textarea.className = 'reviews-compose-textarea';
  textarea.id = `${uid}-text`;
  textarea.name = 'review';
  textarea.required = true;
  textarea.placeholder = labels.placeholder;
  editor.append(textarea);

  const error = document.createElement('p');
  error.className = 'reviews-compose-error';
  error.id = `${uid}-error`;
  error.hidden = true;
  error.textContent = 'Please write your review before posting.';
  textarea.setAttribute('aria-describedby', error.id);

  const footer = document.createElement('div');
  footer.className = 'reviews-compose-footer';
  const post = document.createElement('button');
  post.type = 'submit';
  post.className = 'reviews-compose-post';
  post.textContent = labels.button;
  footer.append(ratingInput(uid, labels.ratingLabel), post);

  body.append(label, editor, error, footer);
  form.append(body);

  const clearError = () => {
    error.hidden = true;
    textarea.removeAttribute('aria-invalid');
  };
  textarea.addEventListener('input', () => {
    if (textarea.value.trim()) clearError();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!textarea.value.trim()) {
      error.hidden = false;
      textarea.setAttribute('aria-invalid', 'true');
      textarea.focus();
      return;
    }
    clearError();
    const href = leaveReviewHref(authoredHref) || `${FOOD_ORIGIN}/recipes`;
    window.open(href, '_blank', 'noopener');
  });
  return form;
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
 * Optional 2-cell label rows anywhere: Empty heading | Placeholder | Rating label | Button.
 * Shows the first 10 reviews (as on the source); "Show more reviews" reveals the rest.
 * With no review rows (or a 0 count) the header reads "Be the first to review".
 */
export default function decorate(block) {
  const { labels, rest: rows } = extractLabelRows([...block.children]);
  const first = rows[0];
  const firstCells = first ? [...first.children] : [];
  // the summary row is a single cell; tolerate a short row that reads "x of 5 stars (n reviews)"
  const looksLikeSummary = !!first && !!parseRating(first.textContent)
    && /review/i.test(first.textContent) && firstCells.length < 4;
  const hasSummary = !!first && (firstCells.length < 2 || looksLikeSummary);
  const summaryRow = hasSummary ? rows.shift() : null;
  const summaryCell = summaryRow?.firstElementChild || null;

  const list = document.createElement('ul');
  list.className = 'reviews-list';
  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.some((cell) => cell.textContent.trim())) return;
    list.append(reviewItem(cells));
  });

  const isEmpty = !list.children.length
    || summaryCount(summaryCell?.textContent.trim().replace(/\s+/g, ' ') || '') === 0;
  const header = buildHeader(summaryCell, isEmpty ? labels.emptyHeading : '');
  const compose = buildCompose(labels, summaryCell?.querySelector('a[href]')?.getAttribute('href') || '');

  block.replaceChildren(header, compose);
  if (list.children.length) {
    block.append(list);
    addShowMore(block, list);
  } else {
    block.classList.add('reviews-empty');
  }
}
