import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });

    // Wrap the whole card in the heading's link so image + text are clickable.
    const link = li.querySelector('a[href]');
    if (link) {
      const { href } = link;
      const label = link.textContent.trim();
      // Unwrap the heading anchor, keeping its text (avoid nested links).
      link.replaceWith(...link.childNodes);
      const anchor = document.createElement('a');
      anchor.className = 'cards-card-link';
      anchor.href = href;
      anchor.setAttribute('aria-label', label);
      while (li.firstElementChild) anchor.append(li.firstElementChild);
      li.append(anchor);
    }

    ul.append(li);
  });

  // replace images with optimized versions
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));

  block.replaceChildren(ul);
  // expose card count so CSS can size the grid (fill row, max 4 across)
  block.dataset.count = ul.children.length;
}
