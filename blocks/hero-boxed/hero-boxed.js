import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Hero Boxed block
 * Row 1: image. Row 2: headline (H1-H6), optionally linked.
 * Renders the image full width with the headline in a white box overlaid
 * bottom-left. When the headline is linked, the whole block is the link.
 * @param {Element} block The hero-boxed block element
 */
export default function decorate(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const picture = block.querySelector('picture');
  const link = (heading && heading.querySelector('a[href]')) || block.querySelector('a[href]');
  const href = link?.href;

  const media = document.createElement('div');
  media.className = 'hero-boxed-image';
  if (picture) {
    const img = picture.querySelector('img');
    media.append(img
      ? createOptimizedPicture(img.src, img.alt, true, [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '900' },
      ])
      : picture);
  }

  const box = document.createElement('div');
  box.className = 'hero-boxed-box';
  if (heading) {
    heading.classList.add('hero-boxed-title');
    // the whole block links instead of the heading text (avoid nested links)
    if (link && heading.contains(link)) link.replaceWith(...link.childNodes);
    box.append(heading);
  }

  const inner = document.createElement(href ? 'a' : 'div');
  inner.className = 'hero-boxed-inner';
  if (href) {
    inner.href = href;
    if (heading) inner.setAttribute('aria-label', heading.textContent.trim());
  }
  inner.append(media, box);
  block.replaceChildren(inner);
}
