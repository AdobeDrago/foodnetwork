/**
 * Breadcrumb block
 * One cell holding the trail in hierarchy order. Linked items stay links;
 * an unlinked last item is the current page. Accepts a list (ul/ol) or a line of
 * links separated by text such as ">" or "/".
 */

function collectItems(cell) {
  const list = cell.querySelector('ol, ul');
  if (list) {
    return [...list.children].map((li) => {
      const a = li.querySelector('a[href]');
      return { label: (a || li).textContent.trim(), href: a ? a.href : null };
    }).filter((item) => item.label);
  }

  // fallback: links plus trailing plain text (separators are dropped)
  const items = [];
  cell.querySelectorAll('p, div').forEach((el) => { if (!el.children.length && !el.textContent.trim()) el.remove(); });
  // eslint-disable-next-line no-bitwise
  const whatToShow = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT;
  const walker = document.createTreeWalker(cell, whatToShow);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A' && node.href) {
      items.push({ label: node.textContent.trim(), href: node.href });
    } else if (node.nodeType === Node.TEXT_NODE && !node.parentElement.closest('a')) {
      node.textContent.split(/[>/›»|]/).map((t) => t.trim()).filter(Boolean)
        .forEach((label) => items.push({ label, href: null }));
    }
    node = walker.nextNode();
  }
  return items.filter((item) => item.label);
}

export default function decorate(block) {
  const cell = block.querySelector(':scope > div > div') || block;
  const items = collectItems(cell);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  const ol = document.createElement('ol');
  ol.className = 'breadcrumb-list';

  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'breadcrumb-item';
    const isLast = i === items.length - 1;
    if (item.href) {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      li.append(a);
    } else {
      const span = document.createElement('span');
      span.textContent = item.label;
      if (isLast) span.setAttribute('aria-current', 'page');
      li.append(span);
    }
    ol.append(li);
  });

  nav.append(ol);
  block.replaceChildren(nav);
}
