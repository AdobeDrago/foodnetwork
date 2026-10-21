// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');
// live header waits 100ms so crossing items does not flicker
const HOVER_DELAY = 100;
// "9pm | 8c" marks a TV-schedule row inside a flyout group
const SCHEDULE_TIME_RE = /\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\s*\|/i;

/**
 * Local stand-ins for chrome icons. The nav document currently stores every
 * image as about:error, so the logo and tools would otherwise not paint.
 */
const FALLBACK_ICONS = {
  'main menu': '/icons/nav-menu.svg',
  'food network': '/icons/nav-logo.svg',
  search: '/icons/search.svg',
  'submit site search': '/icons/search.svg',
  saves: '/icons/saves.svg',
  'shopping list': '/icons/shopping-list.svg',
  'user profile menu': '/icons/profile.svg',
  'follow us on facebook': '/icons/facebook.svg',
  'follow us on twitter': '/icons/twitter.svg',
  'follow us on instagram': '/icons/instagram.svg',
  'follow us on youtube': '/icons/youtube.svg',
  'follow us on pinterest': '/icons/pinterest.svg',
  'follow us on snapchat': '/icons/snapchat.svg',
};

/** True when a src can be requested (not the pipeline's about:error placeholder). */
function isUsableSrc(src) {
  return /^(https?:|data:|\/)/.test(src);
}

/**
 * Fetch the nav fragment. Metadata-independent dual-fetch:
 * /content first (localhost / aem up), then root (DA/EDS production).
 * Relative image URLs are resolved against the fragment so they keep working
 * when the header is injected into any page.
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const base = new URL(resp.url, window.location.href);
  const tmp = document.createElement('div');
  tmp.innerHTML = await resp.text();
  tmp.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (isUsableSrc(src)) return;
    const alt = (img.getAttribute('alt') || '').trim().toLowerCase();
    const fallback = FALLBACK_ICONS[alt];
    if (fallback) {
      img.setAttribute('src', fallback);
      return;
    }
    if (src && !src.startsWith('about:')) img.setAttribute('src', new URL(src, base).href);
  });
  return tmp;
}

/** Render an authored icon image as a CSS mask so it can take hover colors. */
function maskIcon(img, name) {
  const span = document.createElement('span');
  span.className = `nav-icon nav-icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  if (img) span.style.setProperty('--icon', `url("${img.getAttribute('src')}")`);
  return span;
}

/** Slug for icon class names, derived from an image file name. */
function iconName(img) {
  const file = (img.getAttribute('src') || '').split('/').pop().split('?')[0];
  return file.replace(/^icon-/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

/** Class slug for a header tool. Authored files are media hashes, so the label wins. */
const TOOL_ICON_NAMES = {
  saves: 'saves',
  'shopping list': 'shopping-list',
  'user profile menu': 'profile',
};

function toolLabel(li, link, img) {
  if (link && link.textContent.trim()) return link.textContent.trim();
  if (img && img.alt.trim()) return img.alt.trim();
  const paragraph = [...li.children].find((c) => c.tagName === 'P');
  return paragraph ? paragraph.textContent.trim() : '';
}

function toolIconName(label, img) {
  const named = TOOL_ICON_NAMES[label.trim().toLowerCase()];
  if (named) return named;
  return img ? iconName(img) : 'tool';
}

/**
 * Element matching a tag on a list item.
 * DA wraps authored runs in a paragraph, and optimized images in `<picture>`.
 */
function child(li, tag) {
  const direct = [...li.children].find((c) => c.tagName === tag);
  if (direct) return direct;
  const name = tag.toLowerCase();
  return [...li.children]
    .filter((c) => c.tagName === 'P')
    .map((p) => p.querySelector(`:scope > ${name}, :scope > picture > ${name}`))
    .find(Boolean);
}

/** Build a CTA pill from an authored `<em><a>` link. */
function buildCta(a) {
  const cta = a.cloneNode(true);
  cta.className = 'nav-cta';
  return cta;
}

/** Red "See all" treatment. An authored arrow is kept; otherwise one is added. */
function decorateSeeAll(link, labelText) {
  const arrow = /→\s*$/.test(link.textContent);
  if (arrow || /schedule/i.test(labelText)) link.classList.add('nav-see-all');
  if (!arrow && link.classList.contains('nav-see-all')) link.classList.add('nav-see-all-arrow');
}

/** Plain text of a schedule row that is neither the show link nor the time. */
function scheduleSlot(li) {
  const slot = [...li.querySelectorAll('p, strong')].find((el) => {
    const text = el.textContent.trim();
    return text && !el.querySelector('a') && !SCHEDULE_TIME_RE.test(text);
  });
  return slot ? slot.textContent.trim() : '';
}

/** Time line of a schedule row, e.g. "9pm | 8c". */
function scheduleTime(li) {
  const timed = [...li.querySelectorAll('p, span')].find((el) => {
    const text = el.textContent.trim();
    return text && !el.querySelector('a') && SCHEDULE_TIME_RE.test(text);
  });
  return timed ? timed.textContent.trim() : '';
}

/**
 * TV schedule list: a "see schedule" link, slot labels (On tonight / On now),
 * and show rows with a time line.
 */
function buildScheduleList(items, labelText) {
  const ul = document.createElement('ul');
  ul.className = 'nav-schedule';
  let lastSlot = '';
  items.forEach((item) => {
    const time = scheduleTime(item);
    const slot = scheduleSlot(item);
    const a = item.querySelector('a');
    if (!time) {
      if (a) {
        const out = document.createElement('li');
        const link = a.cloneNode(true);
        decorateSeeAll(link, labelText);
        out.append(link);
        ul.append(out);
      } else if (slot && slot !== lastSlot) {
        const out = document.createElement('li');
        out.className = 'nav-schedule-slot';
        out.textContent = slot;
        ul.append(out);
        lastSlot = slot;
      }
      return;
    }
    if (slot && slot !== lastSlot) {
      const heading = document.createElement('li');
      heading.className = 'nav-schedule-slot';
      heading.textContent = slot;
      ul.append(heading);
      lastSlot = slot;
    }
    if (!a) return;
    const out = document.createElement('li');
    out.className = 'nav-schedule-show';
    out.append(a.cloneNode(true));
    const meta = document.createElement('span');
    meta.className = 'nav-schedule-time';
    meta.textContent = time;
    out.append(meta);
    ul.append(out);
  });
  return ul;
}

/** Build one image card (image + title link) from an authored list item. */
function buildCard(li) {
  const img = li.querySelector('img');
  const a = li.querySelector('a');
  const card = document.createElement('a');
  card.className = 'nav-card';
  card.href = a ? a.href : '#';
  const media = document.createElement('span');
  media.className = 'nav-card-media';
  if (img) {
    const pic = img.cloneNode(true);
    pic.loading = 'lazy';
    // tall artwork (show posters) renders as a portrait chip without a caption
    pic.addEventListener('load', () => {
      if (pic.naturalHeight > pic.naturalWidth * 1.2) card.classList.add('nav-card-portrait');
    }, { once: true });
    media.append(pic);
  }
  const title = document.createElement('span');
  title.className = 'nav-card-title';
  title.textContent = a ? a.textContent.trim() : '';
  card.append(media, title);
  if (a && a.closest('strong')) card.classList.add('nav-card-round');
  return card;
}

/** Build a panel group (label + link list or card list + optional CTA). */
function buildGroup(li) {
  const group = document.createElement('div');
  group.className = 'nav-group';
  const label = child(li, 'STRONG');
  if (label) {
    const span = document.createElement('span');
    span.className = 'nav-group-label';
    span.textContent = label.textContent.trim();
    group.append(span);
  }
  const list = child(li, 'UL');
  if (list) {
    const items = [...list.children];
    const cards = items.some((item) => item.querySelector('img'));
    const labelText = label ? label.textContent : '';
    const schedule = !cards && items.some((item) => SCHEDULE_TIME_RE.test(item.textContent));
    let ul;
    if (schedule) ul = buildScheduleList(items, labelText);
    else {
      ul = document.createElement('ul');
      ul.className = cards ? 'nav-cards' : 'nav-links';
      items.forEach((item) => {
        if (cards && !item.querySelector('img')) return;
        const out = document.createElement('li');
        if (cards) out.append(buildCard(item));
        else {
          const a = item.querySelector('a');
          if (a) {
            const link = a.cloneNode(true);
            decorateSeeAll(link, labelText);
            out.append(link);
          }
        }
        ul.append(out);
      });
    }
    group.classList.add(cards ? 'nav-group-media' : 'nav-group-text');
    group.append(ul);
    if (cards) {
      items.filter((item) => !item.querySelector('img')).forEach((item) => {
        const a = item.querySelector('a');
        if (!a) return;
        const link = a.cloneNode(true);
        if (/see all|→\s*$/i.test(link.textContent)) link.classList.add('nav-see-all');
        group.append(link);
      });
    }
  }
  const cta = li.querySelector(':scope > p > em > a');
  if (cta) group.append(buildCta(cta));
  return group;
}

/** Build the flyout panel for a top-level item. */
function buildPanel(subList) {
  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  const inner = document.createElement('div');
  inner.className = 'nav-panel-inner';
  const groups = document.createElement('div');
  groups.className = 'nav-groups';
  inner.append(groups);
  [...subList.children].forEach((li) => {
    const lone = li.querySelector(':scope > em > a, :scope > p > em > a');
    if (lone && !child(li, 'UL')) {
      const row = document.createElement('div');
      row.className = 'nav-panel-cta';
      row.append(buildCta(lone));
      inner.append(row);
    } else groups.append(buildGroup(li));
  });
  if (!groups.querySelector('.nav-group-media')) groups.classList.add('nav-groups-columns');
  panel.append(inner);
  return panel;
}

/** Shared open/close state for every hover/click dropdown in the header. */
function createDropdowns(nav) {
  const openers = [];
  const closeAll = (except) => {
    openers.forEach((o) => { if (o !== except) o.close(); });
    nav.classList.toggle('is-active', !!(except && except.isOpen()));
  };
  const register = (item, trigger, { hover = true } = {}) => {
    let hoverTimer;
    const cancelHover = () => window.clearTimeout(hoverTimer);
    const api = {
      isOpen: () => item.classList.contains('is-open'),
      open: () => {
        cancelHover();
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        closeAll(api);
      },
      close: () => {
        cancelHover();
        item.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      },
    };
    trigger.setAttribute('aria-expanded', 'false');
    if (hover) {
      item.addEventListener('mouseenter', () => {
        if (!isDesktop.matches) return;
        cancelHover();
        hoverTimer = window.setTimeout(() => api.open(), HOVER_DELAY);
      });
      item.addEventListener('mouseleave', () => {
        cancelHover();
        if (isDesktop.matches) { api.close(); closeAll(null); }
      });
    }
    item.addEventListener('focusin', () => { if (isDesktop.matches && hover) api.open(); });
    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) { api.close(); closeAll(null); }
    });
    openers.push(api);
    return api;
  };
  return { register, closeAll };
}

/** Build the search form; action and placeholder come from the authored link. */
function buildSearch(p) {
  const a = p.querySelector('a');
  const form = document.createElement('form');
  form.className = 'nav-search';
  form.setAttribute('role', 'search');
  form.action = a ? a.href : '/search';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = a ? a.textContent.trim() : '';
  input.setAttribute('aria-label', 'site search input');
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'nav-search-clear';
  clear.setAttribute('aria-label', 'clear search input');
  clear.hidden = true;
  clear.textContent = '×';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit';
  const img = p.querySelector('img');
  submit.setAttribute('aria-label', img ? img.alt : 'submit site search');
  submit.append(maskIcon(img, 'search'));
  form.append(input, clear, submit);
  const syncClear = () => { clear.hidden = input.value.length === 0; };
  input.addEventListener('input', syncClear);
  clear.addEventListener('click', () => {
    input.value = '';
    syncClear();
    input.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) window.location.href = `${form.action.replace(/\/$/, '')}/${encodeURIComponent(q)}-`;
  });
  return form;
}

export default async function decorate(block) {
  const frag = await fetchNav();
  block.textContent = '';
  if (!frag) return;
  // Sections: [0] brand, [1] main navigation, [2] hamburger "more" menu, [3] tools
  const [brandSection, navSection, moreSection, toolsSection] = [...frag.children];

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  const bar = document.createElement('div');
  bar.className = 'nav-bar';
  const dropdowns = createDropdowns(nav);

  // --- hamburger + "more" menu ---
  if (moreSection) {
    const wrap = document.createElement('div');
    wrap.className = 'nav-more';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-hamburger';
    const icon = moreSection.querySelector(':scope > p img');
    toggle.setAttribute('aria-label', icon ? icon.alt : 'Menu');
    toggle.append(maskIcon(icon, 'menu'));
    const panel = document.createElement('div');
    panel.className = 'nav-more-panel';
    const [links, social] = moreSection.querySelectorAll(':scope > ul');
    if (links) {
      const ul = links.cloneNode(true);
      ul.className = 'nav-more-links';
      panel.append(ul);
    }
    if (social) {
      const ul = document.createElement('ul');
      ul.className = 'nav-social';
      [...social.children].forEach((li) => {
        const a = li.querySelector('a');
        const img = li.querySelector('img');
        if (!a) return;
        const link = document.createElement('a');
        link.href = a.href;
        link.setAttribute('aria-label', a.textContent.trim());
        link.append(maskIcon(img, img ? iconName(img) : 'social'));
        const out = document.createElement('li');
        out.append(link);
        ul.append(out);
      });
      panel.append(ul);
    }
    wrap.append(toggle, panel);
    const api = dropdowns.register(wrap, toggle);
    // desktop: hover already opened it, so a click keeps it open; touch/mobile: toggle
    toggle.addEventListener('click', () => {
      if (api.isOpen() && !isDesktop.matches) {
        api.close();
        dropdowns.closeAll(null);
      } else api.open();
    });
    bar.append(wrap);
  }

  // --- logo ---
  const logo = brandSection && brandSection.querySelector('a');
  if (logo) {
    const brand = logo.cloneNode(true);
    brand.className = 'nav-logo';
    brand.setAttribute('aria-label', 'go to home page');
    bar.append(brand);
  }

  // --- main navigation with flyout panels ---
  const sections = document.createElement('ul');
  sections.className = 'nav-sections';
  const top = navSection && navSection.querySelector(':scope > ul');
  if (top) {
    [...top.children].forEach((li) => {
      const a = child(li, 'A');
      const sub = child(li, 'UL');
      const item = document.createElement('li');
      item.className = 'nav-item';
      const label = a ? a.textContent.trim() : '';
      if (sub) {
        // a panel opens on hover; the label is a button so a click does not navigate
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'nav-link';
        trigger.textContent = label;
        trigger.setAttribute('aria-haspopup', 'true');
        item.classList.add('has-panel');
        item.append(trigger, buildPanel(sub));
        dropdowns.register(item, trigger);
      } else {
        const link = document.createElement('a');
        link.className = 'nav-link';
        link.href = a ? a.href : '#';
        link.textContent = label;
        item.append(link);
        // items without a panel still show the hover bar, and close any open panel
        item.addEventListener('mouseenter', () => { if (isDesktop.matches) dropdowns.closeAll(null); });
      }
      sections.append(item);
    });
  }
  bar.append(sections);

  // --- tools: search, saves, shopping list, profile ---
  if (toolsSection) {
    const tools = document.createElement('div');
    tools.className = 'nav-tools';
    const searchP = toolsSection.querySelector(':scope > p');
    if (searchP) tools.append(buildSearch(searchP));
    const list = toolsSection.querySelector(':scope > ul');
    if (list) {
      [...list.children].forEach((li) => {
        const img = child(li, 'IMG');
        const a = child(li, 'A');
        const menu = child(li, 'UL');
        const label = toolLabel(li, a, img);
        const name = toolIconName(label, img);
        if (a) {
          const link = document.createElement('a');
          link.className = 'nav-tool';
          link.href = a.href;
          link.setAttribute('aria-label', label);
          link.append(maskIcon(img, name));
          tools.append(link);
        } else if (menu) {
          const wrap = document.createElement('div');
          wrap.className = 'nav-tool-menu';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'nav-tool';
          btn.setAttribute('aria-label', label || 'User Profile Menu');
          btn.append(maskIcon(img, name));
          const dd = menu.cloneNode(true);
          dd.className = 'nav-tool-dropdown';
          wrap.append(btn, dd);
          const api = dropdowns.register(wrap, btn, { hover: false });
          btn.addEventListener('click', () => (api.isOpen() ? (api.close(), dropdowns.closeAll(null)) : api.open()));
          tools.append(wrap);
        }
      });
    }
    bar.append(tools);
  }

  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  overlay.addEventListener('click', () => dropdowns.closeAll(null));

  nav.append(bar, overlay);
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') dropdowns.closeAll(null); });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) dropdowns.closeAll(null); });
  isDesktop.addEventListener('change', () => dropdowns.closeAll(null));

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  block.append(wrapper);
}
