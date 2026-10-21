import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Cards Gallery block
 * One row per card: image | title (H3, linked to the gallery page).
 * The whole card becomes clickable through the title link.
 *
 * Option `panel`: card text sits on a white panel and the desktop column
 * count follows the card count (4-up when it divides by four, else 3-up).
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-gallery-card';
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((div) => {
      if (div.querySelector('picture') && div.textContent.trim() === '') div.className = 'cards-gallery-card-image';
      else div.className = 'cards-gallery-card-body';
    });

    const link = li.querySelector('.cards-gallery-card-body a[href]') || li.querySelector('a[href]');
    if (link) {
      const { href } = link;
      const label = link.textContent.trim();
      link.replaceWith(...link.childNodes);
      const anchor = document.createElement('a');
      anchor.className = 'cards-gallery-card-link';
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

  if (block.classList.contains('panel')) {
    const count = ul.children.length;
    block.classList.add(count % 4 === 0 ? 'cards-gallery-cols-4' : 'cards-gallery-cols-3');
  }
}
