import { getMetadata } from './aem.js';

const FOOD_ORIGIN = 'https://www.foodnetwork.com';
const IMAGE_ORIGIN = 'https://food.fnr.sndimg.com';
const RECIPE_PATH = /^\/recipes\/.+-recipe-\d+$/;
const LIST_KEYS = ['items', 'recipes', 'results', 'cards', 'entries', 'docs', 'data', 'recommendations'];
const LABEL_KEYS = ['label', 'facetTitle', 'heading', 'displayName'];
const PUBLIC_PATH = /^\/(recipes|shows|videos|profiles|how-to|grilling)\//;

let recipePromise;
const recommendationCache = new Map();

/**
 * A recipe path, or '' when the value is not one.
 * Accepts plain text or an absolute link, and strips `.sni.json`, `.html`, and a trailing slash.
 * @param {string} value
 * @returns {string}
 */
function normalizeRecipePath(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      path = new URL(raw).pathname;
    } catch (error) {
      return '';
    }
  }
  path = path.replace(/\/+$/, '').replace(/\.sni\.json$/i, '').replace(/\.html$/i, '');
  return RECIPE_PATH.test(path) ? path : '';
}

/**
 * Food Network recipe path for this page, or '' when this is not a recipe URL.
 * An authored `recipe` metadata row wins. Otherwise the page address is used.
 * @returns {string}
 */
export function recipePath() {
  return normalizeRecipePath(getMetadata('recipe')) || normalizeRecipePath(window.location.pathname);
}

/**
 * Absolute Food Network URL for a recipe selector such as `.sni.json`.
 * @param {string} suffix
 * @returns {string}
 */
export function recipeResourceUrl(suffix) {
  const path = recipePath();
  if (!path) return '';
  const extra = suffix.startsWith('.') ? suffix : `.${suffix}`;
  return `${FOOD_ORIGIN}${path}${extra}`;
}

/**
 * @param {number|string} minutes
 * @returns {string} Short duration such as "20 min" or "2 hr 10 min".
 */
export function formatMinutes(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total < 0) return '';
  const rounded = Math.round(total);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours && mins) return `${hours} hr ${mins} min`;
  if (hours === 1) return '1 hr';
  if (hours) return `${hours} hr`;
  return `${mins} min`;
}

/**
 * @param {string} value
 * @returns {string}
 */
export function capitalize(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Public image URL for a DAM path. Leaves absolute URLs unchanged.
 * @param {string} path
 * @returns {string}
 */
export function foodImageUrl(path) {
  if (typeof path !== 'string') return '';
  const text = path.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `${IMAGE_ORIGIN}${text.startsWith('/') ? text : `/${text}`}`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function publicUrl(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text || text.includes('/etc/tags/') || text.includes('/jcr:content')) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (PUBLIC_PATH.test(text)) return `${FOOD_ORIGIN}${text}`;
  return '';
}

/**
 * @param {object} record
 * @returns {{ title: string, url: string } | null}
 */
export function linkItem(record) {
  if (!record || typeof record !== 'object') return null;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  if (!title) return null;
  return { title, url: publicUrl(record.url) };
}

/**
 * @param {object} recipe
 * @returns {string}
 */
export function recipeRatingText(recipe) {
  const value = Number(recipe?.rating?.value);
  if (!Number.isFinite(value)) return '';
  const reviews = Number(recipe.rating.numberOfReviews);
  if (!Number.isFinite(reviews)) return `${value} of 5 stars`;
  const noun = reviews === 1 ? 'review' : 'reviews';
  return `${value} of 5 stars (${reviews} ${noun})`;
}

/**
 * Unique category labels from tags.additional. Tag paths are not public URLs.
 * @param {object} recipe
 * @returns {string[]}
 */
export function categoryTitles(recipe) {
  const groups = recipe?.tags?.additional;
  if (!Array.isArray(groups)) return [];
  const seen = new Set();
  const titles = [];
  groups.flat().forEach((tag) => {
    const title = typeof tag?.title === 'string' ? tag.title.trim() : '';
    const key = title.toLowerCase();
    if (!title || seen.has(key)) return;
    seen.add(key);
    titles.push(title);
  });
  return titles;
}

/**
 * Facet label such as "More Chicken Recipes", from the first main-ingredient tag.
 * @param {object} recipe
 * @returns {string}
 */
export function mainIngredientLabel(recipe) {
  const groups = recipe?.tags?.additional;
  if (!Array.isArray(groups)) return 'More Main Ingredient';
  const tag = groups.flat().find((item) => (
    typeof item?.id === 'string'
    && item.id.startsWith('main-ingredient:')
    && typeof item.title === 'string'
    && item.title.trim()
  ));
  if (!tag) return 'More Main Ingredient';
  return `More ${tag.title.trim()} Recipes`;
}

function titledItems(entry, groupKey, listKey) {
  const group = entry?.[groupKey];
  const list = group?.[listKey];
  if (!Array.isArray(list)) return null;
  const items = list
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim());
  if (!items.length) return null;
  const title = typeof group.title === 'string' ? group.title.trim() : '';
  return { title, items };
}

/**
 * Ingredient sections that actually contain lines, in source order.
 * @param {Array} blocks
 * @returns {{ title: string, items: string[] }[]}
 */
export function ingredientGroups(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((entry) => titledItems(entry, 'ingredients', 'ingredients'))
    .filter(Boolean);
}

/**
 * Direction sections that actually contain steps, in source order.
 * @param {Array} blocks
 * @returns {{ title: string, items: string[] }[]}
 */
export function directionGroups(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((entry) => titledItems(entry, 'directions', 'directionsOnly')
      || titledItems(entry, 'directions', 'directions'))
    .filter(Boolean);
}

function asRecipe(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (data.pageType && data.pageType !== 'RECIPE') return null;
  if (typeof data.title !== 'string' && !Array.isArray(data.blocks)) return null;
  return data;
}

async function fetchResource(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json, text/html' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const text = await response.text();
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
    return trimmed;
  } catch (error) {
    return null;
  }
}

/**
 * The page's `.sni.json`, fetched once. Null when this is not a recipe path
 * or the response is unusable. Callers keep authored content in that case.
 * @returns {Promise<object|null>}
 */
export function loadRecipe() {
  if (!recipePromise) {
    const url = recipeResourceUrl('.sni.json');
    recipePromise = url
      ? fetchResource(url).then(asRecipe)
      : Promise.resolve(null);
  }
  return recipePromise;
}

function stringField(record, keys) {
  if (!record || typeof record !== 'object') return '';
  const key = keys.find((name) => typeof record[name] === 'string' && record[name].trim());
  return key ? record[key].trim() : '';
}

function cardImage(record) {
  const direct = stringField(record, ['imageUrl', 'thumbnailUrl', 'thumbnail', 'promoImage']);
  if (direct) return foodImageUrl(direct);
  if (typeof record.image === 'string') return foodImageUrl(record.image);
  if (record.image && typeof record.image === 'object') {
    const nested = stringField(record.image, ['url', 'path', 'src']);
    if (nested) return foodImageUrl(nested);
  }
  return '';
}

function cardRating(record) {
  const source = record.rating && typeof record.rating === 'object' ? record.rating : record;
  const value = Number(source.value ?? source.rating ?? source.starRating ?? source.averageRating);
  if (!Number.isFinite(value)) return '';
  const count = Number(
    source.numberOfRatings
    ?? source.numberOfReviews
    ?? source.reviewCount
    ?? record.reviewCount
    ?? record.numberOfRatings,
  );
  const suffix = Number.isFinite(count) ? ` (${count})` : '';
  return `${value} of 5 stars${suffix}`;
}

function readCard(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  const title = stringField(record, ['title', 'promoTitle', 'headline', 'name']);
  const href = publicUrl(stringField(record, ['url', 'href', 'link', 'canonicalUrl', 'path']));
  if (!title || !href) return null;
  return {
    title,
    href,
    image: cardImage(record),
    ratingText: cardRating(record),
  };
}

function payloadLabel(data) {
  const label = LABEL_KEYS
    .map((key) => data[key])
    .find((value) => typeof value === 'string' && value.trim());
  return label ? label.trim() : '';
}

function collectRecommendations(data, depth = 0) {
  if (!data || typeof data !== 'object' || depth > 3) return null;
  if (Array.isArray(data)) {
    const cards = data.map(readCard).filter(Boolean);
    return cards.length ? { label: '', cards } : null;
  }
  if (data.pageType === 'RECIPE') return null;
  const label = payloadLabel(data);
  const arrayKey = LIST_KEYS.find((key) => Array.isArray(data[key]));
  if (arrayKey) {
    const cards = data[arrayKey].map(readCard).filter(Boolean);
    if (cards.length) return { label, cards };
  }
  const nested = Object.values(data)
    .map((value) => collectRecommendations(value, depth + 1))
    .find((result) => result?.cards?.length);
  if (!nested) return null;
  return { label: label || nested.label, cards: nested.cards };
}

function cardsFromHtml(html) {
  if (typeof DOMParser === 'undefined') return [];
  if (/<html[\s>]/i.test(html) && /<h1[\s>]/i.test(html)) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('.m-MediaBlock')].map((node) => {
    const link = node.querySelector('a[href]');
    const heading = node.querySelector('h2, h3');
    const title = (heading?.textContent || link?.textContent || '').trim();
    const href = publicUrl(link?.getAttribute('href') || '');
    const img = node.querySelector('img');
    const image = foodImageUrl(img?.getAttribute('src') || img?.getAttribute('data-src') || '');
    if (!title || !href) return null;
    return {
      title, href, image, ratingText: '',
    };
  }).filter(Boolean);
}

/**
 * @param {object|string|null} data
 * @returns {{ label: string, cards: Array } | null}
 */
function normalizeRecommendations(data) {
  if (typeof data === 'string') {
    const cards = cardsFromHtml(data);
    return cards.length ? { label: '', cards } : null;
  }
  return collectRecommendations(data);
}

/**
 * Related-recipe payload for one facet suffix (`.moreQuickEasy` and the others).
 * Failed responses are not cached, so a later click can try again.
 * @param {string} suffix
 * @returns {Promise<{ label: string, cards: Array } | null>}
 */
export function loadRecommendations(suffix) {
  const cached = recommendationCache.get(suffix);
  if (cached) return cached;
  const url = recipeResourceUrl(suffix);
  if (!url) return Promise.resolve(null);
  const pending = fetchResource(url).then((data) => {
    const result = normalizeRecommendations(data);
    if (!result) recommendationCache.delete(suffix);
    return result;
  }).catch(() => {
    recommendationCache.delete(suffix);
    return null;
  });
  recommendationCache.set(suffix, pending);
  return pending;
}
