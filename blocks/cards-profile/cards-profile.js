import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Cards Profile block
 * One row per person: portrait | H3 name (linked), optional role, bio.
 * When the text cell has two or more paragraphs after the name, the first
 * one is the role (e.g. "Food Network Chef"); the rest are the bio.
 * The portrait links to the name's URL.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-profile-item';
    while (row.firstElementChild) li.append(row.firstElementChild);

    let media = null;
    let body = null;
    [...li.children].forEach((div) => {
      if (div.querySelector('picture') && div.textContent.trim() === '') {
        div.className = 'cards-profile-item-image';
        media = div;
      } else if (!div.textContent.trim()) {
        div.remove();
      } else {
        div.className = 'cards-profile-item-body';
        body = div;
      }
    });

    if (body) {
      const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) heading.classList.add('cards-profile-item-name');
      const children = [...body.children];
      const start = heading ? children.indexOf(heading) + 1 : 0;
      const paras = children.slice(start).filter((el) => el.tagName === 'P');
      paras.forEach((p, i) => {
        p.classList.add(i === 0 && paras.length > 1 ? 'cards-profile-item-role' : 'cards-profile-item-bio');
      });

      const nameLink = (heading && heading.querySelector('a[href]')) || null;
      const pic = media?.querySelector('picture');
      if (nameLink && pic && !media.querySelector('a')) {
        const a = document.createElement('a');
        a.href = nameLink.href;
        a.tabIndex = -1;
        a.setAttribute('aria-hidden', 'true');
        pic.replaceWith(a);
        a.append(pic);
      }
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '300' }]));
  });

  block.replaceChildren(ul);
}
