import { decorateIcons } from '../../scripts/aem.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

/*
 * The nav fragment was migrated into DA with every <img> pointing at
 * `about:error` (the importer could not fetch the original assets). Rather
 * than depend on the source document being re-authored, the block repairs
 * images itself:
 *   - chrome icons (logo, utility, social) are swapped for local /icons SVGs
 *   - megamenu thumbnails are restored from the map below, keyed by the
 *     card's link path.
 */
const IMAGE_FIXES = {
  '/shows/halloween-baking-championship': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/shows/h/halloween-baking-championship/fnk-app-show-chip-composite-v2-halloween-baking-championship.jpg.rend.hgtvcom.126.196.suffix/1570457500707.jpeg',
  '/shows/halloween-wars': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/shows/h/halloween-wars/unsized/HalloweenWars_S14_V1_ShowChipVertical_540x840.jpg',
  '/shows/bobbys-triple-threat': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/shows/b/bobbys-triple-threat/BTT_s4_v1_ShowChipVertical_540x840.jpg.rend.hgtvcom.126.196.suffix/1755633970393.jpeg',
  '/shows/bobby-flays-the-line': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/shows/b/bobby-flays-the-line/TheLine_s1_v1_1080x1920.jpg.rend.hgtvcom.126.196.suffix/1788904690168.jpeg',
  '/shows/diners-drive-ins-and-dives': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/shows/d/diners-drive-ins-and-dives/fnk-app-show-chip-composite-diners-drive-ins-dives.jpg.rend.hgtvcom.126.196.suffix/1566856919197.jpeg',
  '/profiles/talent/kardea-brown': 'https://food.fnr.sndimg.com/content/dam/images/food/plus/profiles/kardea-brown/FN-TalentAvatar_Kardea-Brown_s1x1.jpg.rend.hgtvcom.196.196.suffix/1583778811266.jpeg',
  '/profiles/talent/ree-drummond': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/talent/ree-drummond/FN-TalentAvatar-Ree-Drummond-colorblock.jpg.rend.hgtvcom.196.196.suffix/1531174321860.jpeg',
  '/profiles/talent/ina-garten': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/talent/ina-garten/FN-TalentAvatar-Ina-Garten-colorblock.jpg.rend.hgtvcom.196.196.suffix/1531174352136.jpeg',
  '/profiles/talent/sunny-anderson': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/talent/sunny-anderson/FN-TalentAvatar-Sunny-Anderson-colorblock.jpg.rend.hgtvcom.196.196.suffix/1531174628523.jpeg',
  '/profiles/talent/bobby-flay': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/talent/bobby-flay/FN-TalentAvatar-Bobby-Flay-colorblock.jpg.rend.hgtvcom.196.196.suffix/1531174427795.jpeg',
  '/profiles/talent/jet-tila': 'https://food.fnr.sndimg.com/content/dam/images/food/plus/profiles/jet-tila/FN-TalentAvatar_Jet-Tila_s1x1.jpg.rend.hgtvcom.196.196.suffix/1585351505343.jpeg',
  '/profiles/talent/guy-fieri': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/talent/guy-fieri/FN-TalentAvatar-Guy-Fieri-colorblock.jpg.rend.hgtvcom.196.196.suffix/1531174403377.jpeg',
  '/profiles/talent/molly-yeh': 'https://food.fnr.sndimg.com/content/dam/images/food/plus/unsized/avatars/FN-TalentAvatar-Molly-Yeh.jpg',
  '/fn-dish/news/dunkin-ll-bean-collab': 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2026/09/17/FN_Dunkin-LL-Bean_Cup-Sweater_s4x3.jpg.rend.hgtvcom.196.196.suffix/1789671175984.jpeg',
  '/healthyeats/diets/90s-diet-and-nutrition-trends': 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2026/09/18/rx_getty-images-cottage-cheese-stuffed-cantalope_s4x3.jpg.rend.hgtvcom.196.196.suffix/1789743420935.jpeg',
  '/fn-dish/news/i-tried-piiper': 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2026/09/17/FN_Piiper_Products_s4x3.jpg.rend.hgtvcom.196.196.suffix/1789655220759.jpeg',
  '/healthyeats/food-and-nutrition-experts/we-asked-a-dietitian-about-tiktok-health-trends': 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2026/09/15/rx_getty-images-tiktok-health-trends_s4x3.jpg.rend.hgtvcom.196.196.suffix/1789582222427.jpeg',
  '/fn-dish/news/funfetti-releases-dot-cake-inspired-frosting': 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2026/09/14/FN_Funfetti-Dot-Frosting_s4x3.jpg.rend.hgtvcom.196.196.suffix/1789412025648.jpeg',
  '/how-to/packages/shopping/product-reviews/best-electric-knives': 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2025/11/17/Original_Taylor-Murray_Electric-Knife-Test_Overall.jpg.rend.hgtvcom.196.196.suffix/1763408699062.jpeg',
  '/how-to/packages/shopping/best-tailgating-game-day-buys-and-shippable-food': 'https://food.fnr.sndimg.com/content/dam/images/food/products/2026/9/1/rx_qvc_blackstone-omnivore-tabletop-griddle.jpg.rend.hgtvcom.196.196.suffix/1788272578286.jpeg',
  '/how-to/packages/shopping/best-gravy-boats': 'https://food.fnr.sndimg.com/content/dam/images/food/products/2025/11/17/rx_open-kitchen-by-williams-sonoma-gravy-boat.jpeg.rend.hgtvcom.196.196.suffix/1763413934535.jpeg',
  '/sponsored/sweepstakes/taste-of-fall': 'https://food.fnr.sndimg.com/content/dam/images/food/editorial/homepage/FN-Social-Taste-Of-Fall-2026-400x400-V1.jpg.rend.hgtvcom.196.196.suffix/1788962498634.jpeg',
  '/profiles/talent/food-network-kitchen': 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2024/09/30/FNM080124_test-kitchen-opener_s4x3.jpg.rend.hgtvcom.196.196.suffix/1727715670357.jpeg',
  '/profiles/editorial/about-healthy-eating-food-network-kitchen-recipes': 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2020/11/16/0/FNK_Air-Fryer-Parmesan-Chicken-Broccoli_H1_s4x3.jpg.rend.hgtvcom.196.196.suffix/1605561210481.jpeg',
  '/profiles/editorial/food-network-shopping-experts': 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2024/04/11/Original_Taylor-Murray_Spatula-Product-Test-GreenPan.jpg.rend.hgtvcom.196.196.suffix/1712862243781.jpeg',
};

// Right-hand utility links, matched to a local icon by alt text.
const UTILITY_ICONS = {
  saves: 'saves',
  'shopping list': 'shopping-list',
  'user profile': 'user',
};

// Hamburger-flyout social links, matched to a local icon by alt text.
const SOCIAL_ICONS = {
  facebook: 'facebook',
  twitter: 'twitter',
  x: 'twitter',
  instagram: 'instagram',
  youtube: 'youtube',
  pinterest: 'pinterest',
  snapchat: 'snapchat',
};

/**
 * Fetch the nav fragment. Metadata-independent dual-fetch:
 * /content first (localhost / aem up), then root (DA/EDS production).
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp;
}

/** Normalise an href to a foodnetwork.com pathname (no trailing slash). */
function pathOf(href) {
  try {
    return new URL(href, 'https://www.foodnetwork.com').pathname.replace(/\/$/, '');
  } catch (e) {
    return '';
  }
}

/** Build an EDS icon span (decorateIcons injects the SVG afterwards). */
function iconSpan(name) {
  const span = document.createElement('span');
  span.className = `icon icon-${name}`;
  return span;
}

/**
 * Replace a link's broken <img> with a local icon SVG chosen from `iconMap`
 * by the image's alt text. Falls back to `fallback` when no match is found.
 */
function swapLinkIcon(link, iconMap, fallback) {
  const img = link.querySelector('img');
  const alt = ((img && img.getAttribute('alt')) || link.textContent || '').trim();
  const name = iconMap[alt.toLowerCase()] || fallback;
  link.textContent = '';
  if (name) {
    link.append(iconSpan(name));
    link.setAttribute('aria-label', alt || name);
  }
  return name;
}

/** Restore a broken megamenu thumbnail from IMAGE_FIXES, or drop the card. */
function repairThumb(img) {
  const link = img.closest('a');
  const fix = link && IMAGE_FIXES[pathOf(link.getAttribute('href'))];
  if (fix) {
    img.src = fix;
    img.loading = 'lazy';
  } else {
    (img.closest('li') || img).remove();
  }
}

/** Close all open megamenu panels within a container. */
function closeAllPanels(container) {
  container.querySelectorAll('.nav-item[aria-expanded="true"]').forEach((item) => {
    item.setAttribute('aria-expanded', 'false');
    const t = item.querySelector('.nav-trigger');
    if (t) t.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Build one top-level nav item from a heading + the sibling nodes that
 * belong to its panel (everything up to the next H2). If there are no
 * panel nodes, the item renders as a plain link (e.g. "What's on TV").
 */
function buildNavItem(heading, panelNodes) {
  const item = document.createElement('div');
  item.className = 'nav-item';

  const headingLink = heading.querySelector('a');
  const label = (headingLink || heading).textContent.trim();
  const href = headingLink ? headingLink.getAttribute('href') : null;

  // No panel content → plain top-level link.
  if (panelNodes.length === 0) {
    const link = document.createElement('a');
    link.className = 'nav-trigger nav-link';
    link.textContent = label;
    if (href) link.href = href;
    item.append(link);
    return item;
  }

  item.setAttribute('aria-expanded', 'false');

  const trigger = document.createElement('button');
  trigger.className = 'nav-trigger';
  trigger.type = 'button';
  trigger.textContent = label;
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  item.append(trigger);

  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  const inner = document.createElement('div');
  inner.className = 'nav-panel-inner';
  panel.append(inner);

  // Group panel content into columns. Each H3 starts a new column; lists
  // before the first H3 form a default column.
  let currentCol = null;
  const startColumn = (title) => {
    currentCol = document.createElement('div');
    currentCol.className = 'nav-col';
    if (title) {
      const h = document.createElement('h3');
      h.textContent = title;
      currentCol.append(h);
    }
    inner.append(currentCol);
  };

  panelNodes.forEach((node) => {
    if (node.tagName === 'H3') {
      startColumn(node.textContent.trim());
    } else if (node.tagName === 'UL') {
      if (!currentCol) startColumn(null);
      const hasImg = node.querySelector('img');
      const list = node.cloneNode(true);
      if (hasImg) {
        const isAvatar = !!list.querySelector('a[href*="/profiles/talent/"]');
        list.className = isAvatar ? 'nav-cards nav-cards-avatar' : 'nav-cards';
        list.querySelectorAll('img').forEach(repairThumb);
        // Talent avatars show the person's name (taken from alt) beneath.
        if (isAvatar) {
          list.querySelectorAll('a').forEach((a) => {
            const img = a.querySelector('img');
            const name = img && img.getAttribute('alt');
            if (name) {
              const caption = document.createElement('span');
              caption.className = 'nav-card-caption';
              caption.textContent = name;
              a.append(caption);
            }
          });
        }
      } else {
        list.className = 'nav-links';
      }
      currentCol.append(list);
      if (hasImg) currentCol = null;
    } else if (node.tagName === 'P') {
      const footer = node.cloneNode(true);
      footer.className = 'nav-panel-footer';
      inner.append(footer);
      currentCol = null;
    }
  });

  item.append(panel);

  item.addEventListener('mouseenter', () => {
    if (isDesktop.matches) {
      closeAllPanels(item.closest('.nav-sections'));
      item.setAttribute('aria-expanded', 'true');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
  item.addEventListener('mouseleave', () => {
    if (isDesktop.matches) {
      item.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
  trigger.addEventListener('click', () => {
    const open = item.getAttribute('aria-expanded') === 'true';
    closeAllPanels(item.closest('.nav-sections'));
    item.setAttribute('aria-expanded', open ? 'false' : 'true');
    trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  return item;
}

/** Build the search form (controls are created in JS, not the fragment). */
function buildSearch() {
  const form = document.createElement('form');
  form.className = 'nav-search';
  form.action = 'https://www.foodnetwork.com/search';
  form.setAttribute('role', 'search');

  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'searchTerm';
  input.setAttribute('aria-label', 'site search input');
  input.placeholder = 'What are you looking for?';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit';
  submit.setAttribute('aria-label', 'submit site search');
  submit.append(iconSpan('search'));

  form.append(input, submit);
  return form;
}

/**
 * Build the hamburger slide-out flyout from a "Main Menu" section:
 * a link list plus (optionally) a social-icon row.
 */
function buildFlyout(section) {
  const flyout = document.createElement('div');
  flyout.className = 'nav-flyout';
  flyout.setAttribute('aria-hidden', 'true');

  [...section.children].forEach((node) => {
    if (node.tagName === 'UL') {
      const hasImg = node.querySelector('img');
      const list = node.cloneNode(true);
      if (hasImg) {
        list.className = 'nav-flyout-social';
        list.querySelectorAll('a').forEach((a) => swapLinkIcon(a, SOCIAL_ICONS, null));
      } else {
        list.className = 'nav-flyout-links';
      }
      flyout.append(list);
    }
  });
  return flyout;
}

export default async function decorate(block) {
  const frag = await fetchNav();
  block.textContent = '';
  if (!frag) return;

  const sections = [...frag.children];
  // Section roles: [0] logo, [1] megamenus, [2] Main Menu flyout, [3] utility icons.
  const logoSection = sections[0];
  const megaSection = sections[1];
  const flyoutSection = sections.find((s) => {
    const h2 = s.querySelector('h2');
    return h2 && h2.textContent.trim() === 'Main Menu' && !h2.querySelector('a');
  });
  const utilitySection = sections[sections.length - 1] !== flyoutSection
    ? sections[sections.length - 1] : null;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.setAttribute('data-open', 'false');

  // --- Brand: hamburger + logo ---
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.type = 'button';
  hamburger.setAttribute('aria-label', 'Main Menu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = '<span class="nav-hamburger-icon"></span>';
  brand.append(hamburger);
  if (logoSection) {
    const logo = logoSection.querySelector('a');
    if (logo) {
      logo.classList.add('nav-logo');
      logo.textContent = '';
      logo.append(iconSpan('logo'));
      logo.setAttribute('aria-label', 'Food Network home');
      brand.append(logo);
    }
  }

  // --- Megamenu sections ---
  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';
  if (megaSection) {
    const nodes = [...megaSection.children];
    let i = 0;
    while (i < nodes.length) {
      if (nodes[i].tagName === 'H2') {
        const heading = nodes[i];
        const panelNodes = [];
        i += 1;
        while (i < nodes.length && nodes[i].tagName !== 'H2') {
          panelNodes.push(nodes[i]);
          i += 1;
        }
        navSections.append(buildNavItem(heading, panelNodes));
      } else {
        i += 1;
      }
    }
  }

  // --- Tools: search + utility icons ---
  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  tools.append(buildSearch());
  if (utilitySection) {
    const utilList = utilitySection.querySelector('ul');
    if (utilList) {
      const utils = document.createElement('div');
      utils.className = 'nav-utility';
      utilList.querySelectorAll('a').forEach((a) => {
        const link = a.cloneNode(true);
        link.classList.add('nav-utility-link');
        const name = swapLinkIcon(link, UTILITY_ICONS, 'user');
        if (name === 'user') link.classList.add('nav-utility-avatar');
        utils.append(link);
      });
      tools.append(utils);
    }
  }

  // --- Hamburger flyout drawer ---
  let flyout = null;
  if (flyoutSection) {
    flyout = buildFlyout(flyoutSection);
    hamburger.addEventListener('click', () => {
      const open = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', open ? 'false' : 'true');
      flyout.setAttribute('aria-hidden', open ? 'true' : 'false');
      nav.setAttribute('data-flyout', open ? 'false' : 'true');
    });
  }

  nav.append(brand, navSections, tools);
  if (flyout) nav.append(flyout);

  // On mobile the megamenu accordions live inside the slide-in drawer; on
  // desktop they sit in the bar. Re-parent when the breakpoint is crossed.
  const placeSections = () => {
    if (!flyout) return;
    if (isDesktop.matches) {
      if (navSections.parentElement !== nav) nav.insertBefore(navSections, tools);
    } else if (navSections.parentElement !== flyout) {
      flyout.prepend(navSections);
    }
  };
  placeSections();

  // Close panels/flyout when focus leaves the nav (desktop keyboard support).
  nav.addEventListener('focusout', (e) => {
    if (!nav.contains(e.relatedTarget) && isDesktop.matches) closeAllPanels(navSections);
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      closeAllPanels(navSections);
      if (flyout) {
        flyout.setAttribute('aria-hidden', 'true');
        hamburger.setAttribute('aria-expanded', 'false');
        nav.setAttribute('data-flyout', 'false');
      }
    }
  });

  // Reset state when crossing the desktop/mobile breakpoint.
  isDesktop.addEventListener('change', () => {
    closeAllPanels(navSections);
    nav.setAttribute('data-open', 'false');
    nav.setAttribute('data-flyout', 'false');
    hamburger.setAttribute('aria-expanded', 'false');
    if (flyout) flyout.setAttribute('aria-hidden', 'true');
    placeSections();
  });

  decorateIcons(nav);
  block.append(nav);
}
