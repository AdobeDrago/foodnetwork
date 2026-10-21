import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Cards Collage block
 * One row per tile: 4x3 image | H3 title (linked to the gallery page).
 * Row 1 is the large feature tile; following rows are the smaller tiles
 * stacked in the side column. The whole tile links through the title link.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row, index) => {
    const li = document.createElement('li');
    li.className = `cards-collage-card ${index === 0 ? 'cards-collage-card-feature' : 'cards-collage-card-small'}`;
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((div) => {
      if (div.querySelector('picture') && div.textContent.trim() === '') div.className = 'cards-collage-card-image';
      else div.className = 'cards-collage-card-body';
    });

    const link = li.querySelector('.cards-collage-card-body a[href]') || li.querySelector('a[href]');
    if (link) {
      const { href } = link;
      const label = link.textContent.trim();
      link.replaceWith(...link.childNodes);
      const anchor = document.createElement('a');
      anchor.className = 'cards-collage-card-link';
      anchor.href = href;
      if (label) anchor.setAttribute('aria-label', label);
      while (li.firstElementChild) anchor.append(li.firstElementChild);
      li.append(anchor);
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const feature = img.closest('.cards-collage-card-feature');
    const eager = !!feature;
    const width = feature ? '1200' : '600';
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, eager, [{ width }]));
  });

  block.replaceChildren(ul);
}
