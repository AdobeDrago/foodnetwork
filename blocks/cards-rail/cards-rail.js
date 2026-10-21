import { createOptimizedPicture } from '../../scripts/aem.js';

// source feed ("Recently on TV") shows 4 items, then 10 more per "Load More" click
const FEED_INITIAL = 4;
const FEED_STEP = 10;

let feedCount = 0;

function isLinkOnlyRow(row) {
  if (row.querySelector('picture')) return false;
  const links = row.querySelectorAll('a[href]');
  return links.length === 1 && row.textContent.trim() === links[0].textContent.trim();
}

function setupLoadMore(block, ul) {
  const cards = [...ul.children];
  if (cards.length <= FEED_INITIAL) return;

  feedCount += 1;
  ul.id = ul.id || `cards-rail-list-${feedCount}`;
  cards.slice(FEED_INITIAL).forEach((li) => { li.hidden = true; });

  const actions = document.createElement('div');
  actions.className = 'cards-rail-actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cards-rail-load-more';
  button.textContent = 'Load More';
  button.setAttribute('aria-controls', ul.id);
  actions.append(button);
  block.append(actions);

  button.addEventListener('click', () => {
    const hidden = [...ul.querySelectorAll(':scope > li[hidden]')];
    const next = hidden.slice(0, FEED_STEP);
    next.forEach((li) => { li.hidden = false; });
    if (hidden.length <= FEED_STEP) {
      actions.remove();
      const link = next[0] && next[0].querySelector('a');
      if (link) link.focus();
    }
  });
}

/**
 * Cards Rail block
 * Compact list for narrow rails. One row per card: small thumbnail | title link.
 * An optional last row holding only a link (e.g. "More Recipes") renders as a
 * trailing action below the list. Without that row the block is a feed: cards
 * get dividers and a "Load More" button pages through long lists.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const moreLink = rows.length > 1 && isLinkOnlyRow(rows[rows.length - 1])
    ? rows.pop().querySelector('a[href]')
    : null;

  const ul = document.createElement('ul');
  ul.className = 'cards-rail-list';

  rows.forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-rail-card';
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((div) => {
      if (div.querySelector('picture') && div.textContent.trim() === '') div.className = 'cards-rail-card-image';
      else div.className = 'cards-rail-card-body';
    });

    const link = li.querySelector('.cards-rail-card-body a[href]') || li.querySelector('a[href]');
    if (link) {
      const { href } = link;
      const label = link.textContent.trim();
      link.replaceWith(...link.childNodes);
      const anchor = document.createElement('a');
      anchor.className = 'cards-rail-card-link';
      anchor.href = href;
      if (label) anchor.setAttribute('aria-label', label);
      while (li.firstElementChild) anchor.append(li.firstElementChild);
      li.append(anchor);
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]));
  });

  block.replaceChildren(ul);

  if (moreLink) {
    const actions = document.createElement('div');
    actions.className = 'cards-rail-actions';
    moreLink.className = 'cards-rail-more';
    actions.append(moreLink);
    block.append(actions);
  } else {
    block.classList.add('cards-rail-feed');
    setupLoadMore(block, ul);
  }
}
