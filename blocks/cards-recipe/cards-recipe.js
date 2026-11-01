import { createOptimizedPicture } from '../../scripts/aem.js';
import { loadSuggestions } from '../../scripts/recipe-data.js';

const RATING_RE = /(\d+(?:\.\d+)?)\s*(?:of|out of|\/)\s*5(?:\s*stars?)?/i;
const FILTERS = [
  { suffix: '.quickAndEasy', label: 'Quick & Easy' },
  { suffix: '.highlyRated', label: 'Highly Rated' },
  { suffix: '.healthy', label: 'Healthy' },
  { suffix: '.fiveIngredientsOrLess', label: 'Surprise Me' },
];

/**
 * Recipe detail pages (the main well holds the recipe body) get the suggestion
 * filters and bare review counts; category/hub grids read "58 Reviews".
 */
function isRecipeDetail(block) {
  return !!block.closest('main')?.querySelector('.columns-recipe-body');
}

/**
 * Turn a paragraph like "4.5 of 5 stars (182)" into a star meter + count.
 */
function decorateRating(p, withLabel = false) {
  const text = p.textContent.trim();
  const match = text.match(RATING_RE);
  if (!match) return;
  const value = Math.max(0, Math.min(5, parseFloat(match[1])));
  const rest = text.replace(match[0], '');
  const countMatch = rest.match(/\d[\d,]*/);

  const wrap = document.createElement('p');
  wrap.className = 'cards-recipe-rating';

  const stars = document.createElement('span');
  stars.className = 'cards-recipe-stars';
  stars.setAttribute('role', 'img');
  stars.setAttribute('aria-label', `${value} of 5 stars`);
  // source rounds up to the nearest half star (4.1 -> 4.5, 4.6 -> 5)
  const shown = Math.ceil(value * 2) / 2;
  for (let i = 1; i <= 5; i += 1) {
    const star = document.createElement('span');
    let state = 'empty';
    if (shown >= i) state = 'full';
    else if (shown >= i - 0.5) state = 'half';
    star.className = `cards-recipe-star cards-recipe-star-${state}`;
    stars.append(star);
  }
  wrap.append(stars);

  if (countMatch) {
    const count = document.createElement('span');
    count.className = 'cards-recipe-count';
    const [countText] = countMatch;
    count.textContent = withLabel
      ? `${countText} ${countText === '1' ? 'Review' : 'Reviews'}`
      : countText;
    wrap.append(count);
  }
  p.replaceWith(wrap);
}

function cardItem({
  href, title, image, ratingText,
}) {
  const li = document.createElement('li');
  li.className = 'cards-recipe-card';
  const anchor = document.createElement('a');
  anchor.className = 'cards-recipe-card-link';
  anchor.href = href;
  if (title) anchor.setAttribute('aria-label', title);

  if (image) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'cards-recipe-card-image';
    const img = document.createElement('img');
    img.src = image;
    img.alt = title || '';
    img.loading = 'lazy';
    imageWrap.append(img);
    anchor.append(imageWrap);
  }

  const body = document.createElement('div');
  body.className = 'cards-recipe-card-body';
  const heading = document.createElement('h3');
  heading.textContent = title || '';
  body.append(heading);
  if (ratingText) {
    const rating = document.createElement('p');
    rating.textContent = ratingText;
    body.append(rating);
    decorateRating(rating);
  }
  anchor.append(body);
  li.append(anchor);
  return li;
}

async function selectFilter(block, button, suffix) {
  const buttons = [...block.querySelectorAll('.cards-recipe-filter')];
  const list = block.querySelector(':scope > ul');
  if (!list) return;
  buttons.forEach((el) => { el.disabled = true; });
  list.setAttribute('aria-busy', 'true');
  try {
    const result = await loadSuggestions(suffix);
    if (!result?.cards?.length) return;
    buttons.forEach((el) => el.setAttribute('aria-pressed', String(el === button)));
    list.replaceChildren(...result.cards.map(cardItem));
  } finally {
    buttons.forEach((el) => { el.disabled = false; });
    list.removeAttribute('aria-busy');
  }
}

function addFilters(block) {
  if (!isRecipeDetail(block)) return;
  const bar = document.createElement('div');
  bar.className = 'cards-recipe-filters';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Recipe suggestions');
  FILTERS.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cards-recipe-filter';
    button.setAttribute('aria-pressed', 'false');
    button.textContent = filter.label;
    button.addEventListener('click', () => selectFilter(block, button, filter.suffix));
    bar.append(button);
  });
  block.prepend(bar);
}

/**
 * Cards Recipe block
 * One row per card: image | H3 title link + rating paragraph.
 * Recipe detail pages add the live suggestion filters above the authored cards.
 */
function decorateCards(block) {
  const ul = document.createElement('ul');
  const withLabel = !isRecipeDetail(block);

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-recipe-card';
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((div) => {
      if (div.querySelector('picture') && div.textContent.trim() === '') {
        div.className = 'cards-recipe-card-image';
      } else {
        div.className = 'cards-recipe-card-body';
        div.querySelectorAll('p').forEach((p) => decorateRating(p, withLabel));
      }
    });

    const link = li.querySelector('.cards-recipe-card-body a[href]') || li.querySelector('a[href]');
    if (link) {
      const { href } = link;
      const label = link.textContent.trim();
      link.replaceWith(...link.childNodes);
      const anchor = document.createElement('a');
      anchor.className = 'cards-recipe-card-link';
      anchor.href = href;
      if (label) anchor.setAttribute('aria-label', label);
      while (li.firstElementChild) anchor.append(li.firstElementChild);
      li.append(anchor);
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });

  block.replaceChildren(ul);
}

export default function decorate(block) {
  decorateCards(block);
  addFilters(block);
}
