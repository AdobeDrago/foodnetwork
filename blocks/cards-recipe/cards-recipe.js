import { createOptimizedPicture } from '../../scripts/aem.js';

const RATING_RE = /(\d+(?:\.\d+)?)\s*(?:of|out of|\/)\s*5(?:\s*stars?)?/i;

/**
 * Turn a paragraph like "4.5 of 5 stars (182)" into a star meter + count.
 */
function decorateRating(p) {
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
    count.textContent = countText;
    wrap.append(count);
  }
  p.replaceWith(wrap);
}

/**
 * Cards Recipe block
 * One row per card: image | H3 title link + rating paragraph.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-recipe-card';
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((div) => {
      if (div.querySelector('picture') && div.textContent.trim() === '') {
        div.className = 'cards-recipe-card-image';
      } else {
        div.className = 'cards-recipe-card-body';
        div.querySelectorAll('p').forEach(decorateRating);
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
