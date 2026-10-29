import { getMetadata } from '../../scripts/aem.js';
import { recipePath } from '../../scripts/recipe-data.js';

const FOOD_ORIGIN = 'https://www.foodnetwork.com';
const SHARE_SUBJECT = 'Shared from Food Network';

/**
 * Known actions, matched case-insensitively against the authored label
 * (or the link target for share links authored without a label).
 */
const ACTIONS = [
  { type: 'save', label: 'Save Recipe', test: /\bsave\b/i },
  {
    type: 'pinterest', label: 'Pinterest', title: 'Share on Pinterest', test: /pinterest/i,
  },
  {
    type: 'print', label: 'Print', title: 'Print Recipe', test: /\bprint\b/i,
  },
  {
    type: 'email', label: 'Email', title: 'Share by Email', test: /e-?mail|^mailto:/i,
  },
  { type: 'meal-plan', label: 'Add to Meal Plan', test: /meal\s*plan/i },
];

function findAction(label, href) {
  return ACTIONS.find((action) => action.test.test(label))
    || (href ? ACTIONS.find((action) => action.test.test(href)) : null);
}

/**
 * Absolute foodnetwork.com URL of this recipe, or '' when the page is not a recipe.
 * @returns {string}
 */
function canonicalUrl() {
  const path = recipePath();
  if (path) return `${FOOD_ORIGIN}${path}`;
  // recipe pages without the "-recipe-<id>" slug, or previewed under /content/
  const local = window.location.pathname
    .replace(/^\/content(?=\/)/, '')
    .replace(/\.html$/, '')
    .replace(/\/+$/, '');
  return /^\/recipes\/.+/.test(local) ? `${FOOD_ORIGIN}${local}` : '';
}

function recipeTitle() {
  const h1 = document.querySelector('main h1');
  const text = h1?.textContent.trim();
  if (text) return text;
  return document.title.replace(/\s*[|-]\s*Food Network.*$/i, '').trim();
}

function pinterestUrl(url, title) {
  const share = new URL('https://www.pinterest.com/pin/create/button');
  share.searchParams.set('url', `${url}?soc=sharepin`);
  share.searchParams.set('description', '');
  share.searchParams.set('title', title);
  share.searchParams.set('media', getMetadata('og:image') || '');
  return share.toString();
}

function emailUrl(url, title) {
  const subject = title ? `${title} - ${SHARE_SUBJECT}` : SHARE_SUBJECT;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(url)}`;
}

/**
 * Resolve the href for one action. Share links are rebuilt from the canonical
 * recipe URL; when the page is not a recipe the authored link is kept.
 */
function actionHref(type, authoredHref) {
  const canonical = canonicalUrl();
  const title = recipeTitle();
  if (type === 'pinterest') {
    if (canonical) return pinterestUrl(canonical, title);
    return authoredHref || pinterestUrl(window.location.href, title);
  }
  if (type === 'email') {
    if (canonical) return emailUrl(canonical, title);
    return authoredHref || emailUrl(window.location.href, title);
  }
  // save / meal plan: those account features live on the foodnetwork.com recipe page
  return canonical || authoredHref || window.location.href;
}

function iconSpan() {
  const icon = document.createElement('span');
  icon.className = 'recipe-actions-icon';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function labelSpan(text) {
  const label = document.createElement('span');
  label.className = 'recipe-actions-label';
  label.textContent = text;
  return label;
}

function buildControl(action, authoredLabel, authoredHref) {
  const text = authoredLabel || action?.label || '';
  const type = action?.type || 'link';
  let control;

  if (type === 'print') {
    control = document.createElement('button');
    control.type = 'button';
    control.addEventListener('click', () => window.print());
  } else if (action) {
    control = document.createElement('a');
    control.href = actionHref(type, authoredHref);
    if (type === 'pinterest') {
      control.target = '_blank';
      control.rel = 'noopener noreferrer';
    }
  } else if (authoredHref) {
    control = document.createElement('a');
    control.href = authoredHref;
  } else {
    return null;
  }

  control.className = 'recipe-actions-button';
  const accessibleName = action?.title || action?.label || text;
  const iconOnly = type !== 'save' && type !== 'link';
  const label = labelSpan(text);
  if (iconOnly) {
    control.setAttribute('aria-label', accessibleName);
    control.title = accessibleName;
    label.classList.add('recipe-actions-label-hidden');
  }
  control.append(iconSpan(), label);
  return { control, type };
}

/**
 * Recipe Actions block
 * One row per action, single cell: an authored link or a plain label.
 * Recognised labels: Save Recipe, Pinterest, Print, Email, Add to Meal Plan.
 * Save Recipe keeps its visible label; the others render as icon buttons.
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'recipe-actions-list';

  [...block.children].forEach((row) => {
    const cell = row.firstElementChild || row;
    const link = cell.querySelector('a[href]');
    const authoredLabel = cell.textContent.trim().replace(/\s+/g, ' ');
    const authoredHref = link?.getAttribute('href') || '';
    if (!authoredLabel && !authoredHref) return;

    const action = findAction(authoredLabel, authoredHref);
    const built = buildControl(action, authoredLabel, authoredHref);
    if (!built) return;

    const li = document.createElement('li');
    li.className = `recipe-actions-item recipe-actions-${built.type}`;
    li.append(built.control);
    list.append(li);
  });

  block.replaceChildren(list);
}
