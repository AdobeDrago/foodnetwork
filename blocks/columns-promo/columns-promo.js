import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Columns Promo block
 * One row, two cells: image | headline + description + CTA link.
 * The last paragraph that holds only a link is treated as the CTA.
 *
 * Option `wide`: image about 66% wide; a paragraph above the headline is a
 * small kicker label. Description and CTA are optional.
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('columns-promo-row');
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic && col.textContent.trim() === '') {
        col.classList.add('columns-promo-image');
        const img = pic.querySelector('img');
        if (img) pic.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '900' }]));
      } else {
        col.classList.add('columns-promo-body');
        const paras = [...col.querySelectorAll(':scope > p')];
        const ctaPara = paras.reverse().find((p) => {
          const links = p.querySelectorAll('a[href]');
          return links.length === 1 && p.textContent.trim() === links[0].textContent.trim();
        });
        if (ctaPara && !ctaPara.closest('h1, h2, h3, h4, h5, h6')) {
          ctaPara.classList.add('columns-promo-cta');
        }
        if (block.classList.contains('wide')) {
          const children = [...col.children];
          const heading = col.querySelector(':scope > :is(h1, h2, h3, h4, h5, h6)');
          const headingIndex = heading ? children.indexOf(heading) : -1;
          children.forEach((el, i) => {
            if (el.tagName === 'P' && i < headingIndex) {
              el.classList.remove('columns-promo-cta');
              el.classList.add('columns-promo-kicker');
            }
          });
        }
      }
    });
  });
}
