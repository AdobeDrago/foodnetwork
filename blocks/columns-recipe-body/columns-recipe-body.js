import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Columns Recipe Body block
 * One row, two equal cells of plain content: Ingredients | Directions.
 * Each cell holds an H2, optional H3 sub-groups, lists and links. Ordered
 * lists keep their authored `start` (e.g. a second directions list that
 * continues at 13); the step counter is seeded from it.
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('columns-recipe-body-row');
    [...row.children].forEach((col, i) => {
      col.classList.add('columns-recipe-body-col');
      if (i === 0) col.classList.add('columns-recipe-body-ingredients');
      if (i === 1) col.classList.add('columns-recipe-body-directions');

      col.querySelectorAll('ol').forEach((ol) => {
        const start = parseInt(ol.getAttribute('start'), 10);
        const first = Number.isNaN(start) ? 1 : start;
        ol.style.counterReset = `columns-recipe-body-step ${first - 1}`;
      });

      // a paragraph with an image (e.g. "Watch how to make this recipe") is a media promo
      col.querySelectorAll(':scope > p').forEach((p) => {
        if (p.querySelector('picture')) p.classList.add('columns-recipe-body-media');
      });

      col.querySelectorAll('picture > img').forEach((img) => {
        img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '300' }]));
      });
    });
  });
}
