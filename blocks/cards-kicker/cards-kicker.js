import { createOptimizedPicture } from '../../scripts/aem.js';

const TIME_RE = /\d\s*(am|pm)\b|\|/i;

function isLinkOnly(el) {
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && el.textContent.trim() === links[0].textContent.trim();
}

function isStrongOnly(el) {
  const strong = el.querySelector('strong, b');
  return !!strong && !el.querySelector('a[href]') && el.textContent.trim() === strong.textContent.trim();
}

/**
 * Promo card: image | kicker paragraph + H3 title link.
 * The whole card links to the title's URL.
 */
function decoratePromo(li, body) {
  const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
  const children = [...body.children];
  const headingIndex = heading ? children.indexOf(heading) : -1;
  children.forEach((el, i) => {
    if (el.tagName === 'P' && i < headingIndex) el.classList.add('cards-kicker-card-kicker');
  });
  if (heading) heading.classList.add('cards-kicker-card-title');

  const link = (heading && heading.querySelector('a[href]')) || body.querySelector('a[href]');
  if (!link) return;
  const { href } = link;
  const label = link.textContent.trim();
  link.replaceWith(...link.childNodes);
  const anchor = document.createElement('a');
  anchor.className = 'cards-kicker-card-link';
  anchor.href = href;
  if (label) anchor.setAttribute('aria-label', label);
  while (li.firstElementChild) anchor.append(li.firstElementChild);
  li.append(anchor);
}

/**
 * Image-less card (TV schedule): label, then per listing an eyebrow
 * ("UP NEXT"), a bold show name and a time line; link-only paragraphs are
 * actions. The last action sits at the bottom of the card.
 */
function decorateSchedule(li, body) {
  li.classList.add('cards-kicker-card-schedule');
  const paras = [...body.children];
  const actions = paras.filter((p) => p.tagName === 'P' && isLinkOnly(p));
  paras.forEach((p, i) => {
    if (p.tagName !== 'P') return;
    const text = p.textContent.trim();
    if (!text) return;
    if (actions.includes(p)) {
      const last = actions.length > 1 && p === actions[actions.length - 1];
      p.classList.add(last ? 'cards-kicker-schedule-more' : 'cards-kicker-schedule-action');
    } else if (isStrongOnly(p)) {
      p.classList.add('cards-kicker-schedule-show');
    } else if (i === 0) {
      p.classList.add('cards-kicker-schedule-label');
    } else if (TIME_RE.test(text)) {
      p.classList.add('cards-kicker-schedule-time');
    } else {
      p.classList.add('cards-kicker-schedule-eyebrow');
    }
  });
}

/**
 * Cards Kicker block
 * One row per card: image | kicker paragraph + H3 title link.
 * A row with an empty image cell renders as a text card (TV schedule).
 * Column count follows the card count: up to 4 across.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-kicker-card';
    while (row.firstElementChild) li.append(row.firstElementChild);

    let body = null;
    let hasImage = false;
    [...li.children].forEach((div) => {
      if (div.querySelector('picture') && div.textContent.trim() === '') {
        div.className = 'cards-kicker-card-image';
        hasImage = true;
      } else if (!div.textContent.trim() && !div.querySelector('picture, img')) {
        div.remove();
      } else {
        div.className = 'cards-kicker-card-body';
        body = div;
      }
    });

    if (body && hasImage) decoratePromo(li, body);
    else if (body) decorateSchedule(li, body);

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });

  const count = ul.children.length;
  let cols = count;
  if (count > 4) cols = count % 3 === 0 && count % 4 !== 0 ? 3 : 4;
  block.style.setProperty('--cards-kicker-cols', Math.max(cols, 1));

  block.replaceChildren(ul);
}
