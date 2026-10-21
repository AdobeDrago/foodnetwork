import { createOptimizedPicture } from '../../scripts/aem.js';
import {
  categoryTitles,
  directionGroups,
  foodImageUrl,
  ingredientGroups,
  linkItem,
  loadRecipe,
  recipeRatingText,
} from '../../scripts/recipe-data.js';

function heading(tag, text) {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}

function itemList(tag, items) {
  const list = document.createElement(tag);
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  });
  return list;
}

function columnExtras(col) {
  if (!col) return { media: [], buttons: [] };
  return {
    media: [...col.children].filter((el) => el.tagName === 'P' && el.querySelector('picture')),
    buttons: [...col.children].filter((el) => el.classList.contains('button-container')),
  };
}

function buildIngredients(groups, extras) {
  const col = document.createElement('div');
  col.append(heading('h2', 'Ingredients'));
  groups.forEach((group) => {
    if (group.title) col.append(heading('h3', group.title));
    col.append(itemList('ul', group.items));
  });
  extras.buttons.forEach((button) => col.append(button));
  return col;
}

function buildDirections(groups, extras) {
  const col = document.createElement('div');
  col.append(heading('h2', 'Directions'));
  extras.media.forEach((node) => col.append(node));
  groups.forEach((group, index) => {
    if (index > 0 && group.title) col.append(heading('h3', group.title));
    col.append(itemList('ol', group.items));
  });
  return col;
}

/**
 * Replace authored ingredients and directions when the JSON has them.
 * Picture promos and shopping-list buttons stay in the column they came from.
 * @param {HTMLElement} block
 * @param {object} recipe
 */
function fillRecipeBody(block, recipe) {
  const ingredients = ingredientGroups(recipe.blocks);
  const directions = directionGroups(recipe.blocks);
  if (!ingredients.length && !directions.length) return;

  const row = block.querySelector(':scope > div');
  const cols = row ? [...row.children] : [];
  const ingredientExtras = columnExtras(cols[0]);
  const directionExtras = columnExtras(cols[1]);
  const next = document.createElement('div');
  next.append(
    ingredients.length ? buildIngredients(ingredients, ingredientExtras) : (cols[0] || document.createElement('div')),
    directions.length ? buildDirections(directions, directionExtras) : (cols[1] || document.createElement('div')),
  );
  block.replaceChildren(next);
}

function setCourtesy(p, author) {
  const lead = document.createTextNode('Recipe courtesy of ');
  if (!author.url) {
    p.replaceChildren(lead, author.title);
    return;
  }
  const link = document.createElement('a');
  link.href = author.url;
  link.textContent = author.title;
  p.replaceChildren(lead, link);
}

function setPlainPicture(picture, src, alt) {
  if (!picture || !src) return;
  picture.querySelectorAll('source').forEach((source) => source.remove());
  let img = picture.querySelector('img');
  if (!img) {
    img = document.createElement('img');
    picture.append(img);
  }
  img.setAttribute('src', src);
  img.setAttribute('alt', alt);
  img.removeAttribute('srcset');
}

function paragraphStarting(footer, label) {
  const prefix = `${label.toLowerCase()}:`;
  return [...footer.children].find((el) => (
    el.tagName === 'P' && el.textContent.trim().toLowerCase().startsWith(prefix)
  ));
}

function fillLabelLink(p, label, item) {
  const link = document.createElement('a');
  link.textContent = item.title;
  if (item.url) link.href = item.url;
  p.replaceChildren(document.createTextNode(`${label}: `), link);
}

function ensureLabelParagraph(footer, label, after) {
  const existing = paragraphStarting(footer, label);
  if (existing) return existing;
  const p = document.createElement('p');
  if (after) after.after(p);
  else footer.prepend(p);
  return p;
}

function setShowEpisode(footer, recipe) {
  const show = Array.isArray(recipe.shows) ? linkItem(recipe.shows[0]) : null;
  const episode = Array.isArray(recipe.episodes) ? linkItem(recipe.episodes[0]) : null;
  if (!show && !episode) return;

  let pictureP = [...footer.children].find((el) => el.tagName === 'P' && el.querySelector('picture'));
  const src = foodImageUrl(recipe.image);
  if (!pictureP && src) {
    pictureP = document.createElement('p');
    const link = document.createElement('a');
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.alt = '';
    picture.append(img);
    link.append(picture);
    pictureP.append(link);
    footer.prepend(pictureP);
  }
  if (pictureP) {
    setPlainPicture(pictureP.querySelector('picture'), src, show?.title || episode?.title || '');
    const thumbLink = pictureP.querySelector('a');
    const href = episode?.url || show?.url;
    if (thumbLink && href) thumbLink.href = href;
  }

  let previous = pictureP;
  if (show) {
    const p = ensureLabelParagraph(footer, 'Show', previous);
    fillLabelLink(p, 'Show', show);
    previous = p;
  }
  if (episode) {
    const p = ensureLabelParagraph(footer, 'Episode', previous);
    fillLabelLink(p, 'Episode', episode);
  }
}

function setCategories(footer, titles) {
  if (!titles.length) return;
  let label = [...footer.children].find((el) => (
    el.tagName === 'P' && el.querySelector(':scope > strong')?.textContent.trim().toLowerCase().startsWith('categories')
  ));
  if (!label) {
    label = document.createElement('p');
    const title = footer.querySelector('h2');
    if (title) title.before(label);
    else footer.append(label);
  }
  const strong = label.querySelector(':scope > strong') || document.createElement('strong');
  strong.textContent = 'Categories:';
  label.replaceChildren(strong);
  let pills = label.nextElementSibling;
  if (!pills || pills.tagName !== 'P') {
    pills = document.createElement('p');
    label.after(pills);
  }
  pills.replaceChildren(...titles.map((title) => {
    const span = document.createElement('span');
    span.className = 'recipe-tag';
    span.textContent = title;
    return span;
  }));
}

function setPackage(footer, item) {
  if (!item) return;
  let p = [...footer.children].find((el) => (
    el.tagName === 'P' && el.querySelector(':scope > strong')?.textContent.trim().toLowerCase().startsWith('more from')
  ));
  if (!p) {
    p = document.createElement('p');
    const title = [...footer.querySelectorAll('h2')].find((node) => /looking for/i.test(node.textContent));
    if (title) title.before(p);
    else footer.append(p);
  }
  const strong = document.createElement('strong');
  strong.textContent = 'More From:';
  if (!item.url) {
    p.replaceChildren(strong, ` ${item.title}`);
    return;
  }
  const link = document.createElement('a');
  link.href = item.url;
  link.textContent = item.title;
  p.replaceChildren(strong, ' ', link);
}

/**
 * Title, rating, credit, categories, package, and show/episode sit in default
 * content. The recipe-detail CSS keys off that markup, so the text is swapped
 * in place. The chef avatar and prev/next bar are left as authored.
 * @param {HTMLElement} block
 * @param {object} recipe
 */
function applyRecipeChrome(block, recipe) {
  const scope = block.closest('.section-main') || block.closest('main');
  const h1 = scope?.querySelector('.default-content-wrapper h1');
  if (h1 && typeof recipe.title === 'string' && recipe.title.trim()) {
    h1.textContent = recipe.title.trim();
    const rating = recipeRatingText(recipe);
    if (rating) {
      let ratingP = h1.nextElementSibling;
      if (!ratingP || ratingP.tagName !== 'P') {
        ratingP = document.createElement('p');
        h1.after(ratingP);
      }
      ratingP.textContent = rating;
    }
    const author = linkItem(recipe.author);
    if (author) {
      let courtesy = h1.previousElementSibling;
      if (!courtesy || courtesy.tagName !== 'P' || courtesy.querySelector('picture')) {
        courtesy = document.createElement('p');
        h1.before(courtesy);
      }
      setCourtesy(courtesy, author);
    }
  }

  const footer = block.parentElement?.nextElementSibling;
  if (!footer?.classList.contains('default-content-wrapper')) return;
  setShowEpisode(footer, recipe);
  setCategories(footer, categoryTitles(recipe));
  setPackage(footer, linkItem(recipe.package));
}

/**
 * Columns Recipe Body block
 * One row, two equal cells of plain content: Ingredients | Directions.
 * Each cell holds an H2, optional H3 sub-groups, lists and links. Ordered
 * lists keep their authored `start` (e.g. a second directions list that
 * continues at 13); the step counter is seeded from it.
 */
function decorateBody(block) {
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
        const src = img.getAttribute('src') || '';
        if (!/^https?:\/\//i.test(src) || src.startsWith(window.location.origin)) {
          img.closest('picture').replaceWith(createOptimizedPicture(src, img.alt, false, [{ width: '300' }]));
        }
      });
    });
  });
}

export default async function decorate(block) {
  const recipe = await loadRecipe();
  if (recipe) {
    fillRecipeBody(block, recipe);
    applyRecipeChrome(block, recipe);
  }
  decorateBody(block);
}
