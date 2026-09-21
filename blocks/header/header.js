// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

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
    panel.append(currentCol);
  };

  panelNodes.forEach((node) => {
    if (node.tagName === 'H3') {
      startColumn(node.textContent.trim());
    } else if (node.tagName === 'UL') {
      if (!currentCol) startColumn(null);
      const hasImg = node.querySelector('img');
      const list = node.cloneNode(true);
      list.className = hasImg ? 'nav-cards' : 'nav-links';
      currentCol.append(list);
      if (hasImg) currentCol = null;
    } else if (node.tagName === 'P') {
      const footer = node.cloneNode(true);
      footer.className = 'nav-panel-footer';
      panel.append(footer);
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
  submit.innerHTML = '<span class="icon-search" aria-hidden="true"></span>';

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
      list.className = hasImg ? 'nav-flyout-social' : 'nav-flyout-links';
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
      brand.append(logo);
    }
  }

  // --- Hamburger flyout ---
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
        const img = link.querySelector('img');
        if (img) link.setAttribute('aria-label', img.getAttribute('alt') || '');
        utils.append(link);
      });
      tools.append(utils);
    }
  }

  nav.append(brand, navSections, tools);
  if (flyout) nav.append(flyout);

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
  });

  block.append(nav);
}
