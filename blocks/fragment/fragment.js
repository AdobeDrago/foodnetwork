/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

import {
  decorateMain,
  decorateSidebarSections,
} from '../../scripts/scripts.js';

import {
  loadSections,
} from '../../scripts/aem.js';

/**
 * Pathname for a fragment href (relative or absolute). Absolute URLs are
 * reduced to a same-origin path so `.plain.html` fetches stay on this host.
 * @param {string} href
 * @returns {string}
 */
function fragmentPath(href) {
  if (!href) return '';
  try {
    return new URL(href, window.location).pathname;
  } catch (e) {
    return href.trim();
  }
}

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = fragmentPath(link ? link.getAttribute('href') : block.textContent.trim());
  const fragment = await loadFragment(path);
  if (!fragment) return;

  const fragmentSections = [...fragment.querySelectorAll(':scope > .section')];
  if (!fragmentSections.length) return;

  const section = block.closest('.section');
  // Replace the whole fragment-wrapper so section children stay flat — nested
  // `.section` nodes would hide `.cards-rail` from decorateSidebarSections.
  const host = block.closest('.fragment-wrapper') || block;
  const extras = fragmentSections.flatMap((fragSection) => (
    [...fragSection.classList].filter((name) => name !== 'section')
  ));
  if (section && extras.length) section.classList.add(...extras);
  host.replaceWith(...fragmentSections.flatMap((fragSection) => [...fragSection.childNodes]));

  const main = section?.closest('main');
  if (main) decorateSidebarSections(main);
}
