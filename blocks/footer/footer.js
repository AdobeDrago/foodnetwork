/**
 * Fetch the footer fragment. Metadata-independent dual-fetch:
 * /content first (localhost / aem up), then root (DA/EDS production).
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp;
}

/**
 * Turn an H2 + following UL into a collapsible dropdown toggle.
 * The heading becomes a button that expands/collapses its list.
 */
function buildDropdown(heading, list) {
  const wrapper = document.createElement('div');
  wrapper.className = 'footer-dropdown';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'footer-dropdown-toggle';
  toggle.textContent = heading.textContent.trim();
  toggle.setAttribute('aria-expanded', 'false');

  const panel = list.cloneNode(true);
  panel.className = 'footer-dropdown-panel';

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    wrapper.classList.toggle('is-open', !open);
  });

  wrapper.append(toggle, panel);
  return wrapper;
}

export default async function decorate(block) {
  const frag = await fetchFooter();
  block.textContent = '';
  if (!frag) return;

  const sections = [...frag.children];
  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  // --- Section 0: legal / utility links row ---
  if (sections[0]) {
    const legal = document.createElement('div');
    legal.className = 'footer-legal';
    const list = sections[0].querySelector('ul');
    if (list) legal.append(list.cloneNode(true));
    footer.append(legal);
  }

  // --- Section 1: copyright + edition dropdowns ---
  if (sections[1]) {
    const meta = document.createElement('div');
    meta.className = 'footer-meta';

    const dropdowns = document.createElement('div');
    dropdowns.className = 'footer-dropdowns';
    const nodes = [...sections[1].children];
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (node.tagName === 'H2') {
        const list = nodes[i + 1] && nodes[i + 1].tagName === 'UL' ? nodes[i + 1] : null;
        if (list) {
          dropdowns.append(buildDropdown(node, list));
          i += 1;
        }
      } else if (node.tagName === 'P') {
        const copyright = document.createElement('p');
        copyright.className = 'footer-copyright';
        copyright.textContent = node.textContent.trim();
        meta.append(copyright);
      }
    }
    meta.prepend(dropdowns);
    footer.append(meta);
  }

  block.append(footer);
}
