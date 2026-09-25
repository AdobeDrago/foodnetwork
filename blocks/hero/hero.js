/**
 * Decorates the hero block: full-bleed image with a white caption box
 * anchored to the bottom-left. The whole block becomes a single link so
 * clicking (or hovering) anywhere targets the author-supplied href.
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const picture = block.querySelector('picture');
  const link = block.querySelector('a');
  const href = link?.href;

  // Build the white caption box around the heading.
  const caption = document.createElement('div');
  caption.className = 'hero-caption';
  if (heading) {
    heading.classList.add('hero-title');
    // Unwrap any author link inside the heading — we link the whole block instead.
    if (link) link.replaceWith(...link.childNodes);
    caption.append(heading);
  }

  // Rebuild the block: image + caption inside one clickable wrapper.
  block.textContent = '';
  const inner = document.createElement(href ? 'a' : 'div');
  inner.className = 'hero-link';
  if (href) {
    inner.href = href;
    if (heading) inner.setAttribute('aria-label', heading.textContent.trim());
  }
  if (picture) inner.append(picture);
  inner.append(caption);
  block.append(inner);
}
