import { createOptimizedPicture } from '../../scripts/aem.js';

const PAGE_SIZE = 5;

function isLinkOnlyRow(row) {
  if (row.querySelector('picture')) return false;
  const links = row.querySelectorAll('a[href]');
  return links.length === 1 && row.textContent.trim() === links[0].textContent.trim();
}

/**
 * Cards Feed block
 * One row per article: thumbnail | date, H3 title link, byline, teaser.
 * An optional last row holding only a link becomes the "Load More" control.
 * Items beyond the first page are revealed in batches of PAGE_SIZE.
 * Option `expanded`: every item shows at once; a final link row, if any,
 * renders as a plain link.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const moreLink = rows.length > 1 && isLinkOnlyRow(rows[rows.length - 1])
    ? rows.pop().querySelector('a[href]')
    : null;

  const ul = document.createElement('ul');
  ul.className = 'cards-feed-list';

  rows.forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-feed-item';
    while (row.firstElementChild) li.append(row.firstElementChild);

    let body;
    let media;
    [...li.children].forEach((div) => {
      if (div.querySelector('picture') && div.textContent.trim() === '') {
        div.className = 'cards-feed-item-image';
        media = div;
      } else {
        div.className = 'cards-feed-item-body';
        body = div;
      }
    });

    if (body) {
      const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
      const children = [...body.children];
      const headingIndex = heading ? children.indexOf(heading) : -1;
      // a paragraph before the heading is the date; one starting with "By" is the byline
      children.forEach((p, i) => {
        if (p.tagName !== 'P') return;
        if (i < headingIndex) {
          p.classList.add('cards-feed-item-date');
        } else if (/^by\b/i.test(p.textContent.trim())) {
          p.classList.add('cards-feed-item-byline');
        } else {
          p.classList.add('cards-feed-item-teaser');
        }
      });

      // make the thumbnail link to the article as well
      const titleLink = (heading && heading.querySelector('a[href]')) || body.querySelector('a[href]');
      if (titleLink && media && !media.querySelector('a')) {
        const pic = media.querySelector('picture');
        const a = document.createElement('a');
        a.href = titleLink.href;
        a.tabIndex = -1;
        a.setAttribute('aria-hidden', 'true');
        pic.replaceWith(a);
        a.append(pic);
      }
    }

    // body first in DOM order so text precedes image for screen readers
    if (body && media) li.replaceChildren(body, media);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]));
  });

  block.replaceChildren(ul);

  // option "expanded": show every item, no Load More button
  const expanded = block.classList.contains('expanded');
  const items = [...ul.children];
  const hasMore = !expanded && items.length > PAGE_SIZE;
  if (!hasMore && !moreLink) return;

  const actions = document.createElement('div');
  actions.className = 'cards-feed-actions';
  block.append(actions);

  const showLink = () => {
    if (moreLink) {
      moreLink.className = 'cards-feed-more';
      actions.replaceChildren(moreLink);
    } else {
      actions.remove();
    }
  };

  if (!hasMore) {
    showLink();
    return;
  }

  let visible = PAGE_SIZE;
  items.forEach((li, i) => { li.hidden = i >= visible; });

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cards-feed-more';
  button.textContent = moreLink ? moreLink.textContent.trim() : 'Load More';
  button.addEventListener('click', () => {
    visible += PAGE_SIZE;
    items.forEach((li, i) => { if (i < visible) li.hidden = false; });
    if (visible >= items.length) showLink();
  });
  actions.append(button);
}
