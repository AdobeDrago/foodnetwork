const LABEL_RE = /^([^:]{1,40}:)\s*([\s\S]*)$/;

let popoverCount = 0;

/**
 * Give a cell's loose inline content a paragraph wrapper so every item is
 * an element (DA unwraps single-paragraph cells into bare text).
 */
function normaliseCell(cell) {
  const hasBlockChild = [...cell.children].some((el) => !['STRONG', 'B', 'EM', 'I', 'A', 'SPAN', 'BR'].includes(el.tagName));
  if (hasBlockChild || !cell.textContent.trim()) return;
  const p = document.createElement('p');
  while (cell.firstChild) p.append(cell.firstChild);
  cell.append(p);
}

/**
 * Mark the "Label:" part of an item. A leading <strong>/<b> is used as is;
 * otherwise a plain-text "Label: value" is split at the first colon.
 */
function decorateLabel(el) {
  const first = [...el.childNodes]
    .find((n) => n.nodeType !== Node.TEXT_NODE || n.textContent.trim());
  if (first && ['STRONG', 'B'].includes(first.tagName)) {
    first.classList.add('columns-recipe-info-label');
    return;
  }
  if (el.children.length) return;
  const match = el.textContent.trim().match(LABEL_RE);
  if (!match) return;
  const [, labelText, valueText] = match;
  const label = document.createElement('strong');
  label.className = 'columns-recipe-info-label';
  label.textContent = labelText;
  const value = document.createElement('span');
  value.className = 'columns-recipe-info-value';
  value.textContent = valueText;
  el.replaceChildren(label, ' ', value);
}

/**
 * Popover rows read as a two-column table (label left, value right), so the
 * label loses its trailing colon and the value gets its own element.
 */
function decorateNutritionRow(li) {
  decorateLabel(li);
  const label = li.querySelector(':scope > .columns-recipe-info-label');
  if (!label) return;
  label.textContent = label.textContent.trim().replace(/:$/, '');
  if (li.querySelector(':scope > .columns-recipe-info-value')) return;
  const value = document.createElement('span');
  value.className = 'columns-recipe-info-value';
  [...li.childNodes].filter((n) => n !== label).forEach((n) => value.append(n));
  li.append(value);
}

/**
 * Turn a cell holding a list (e.g. nutrition facts) into a toggle button
 * that reveals the list in a popover. The first non-list element supplies
 * the button text ("Nutrition Info").
 */
function decoratePopover(cell) {
  const list = cell.querySelector(':scope > ul, :scope > ol, :scope > dl');
  if (!list) return false;

  const labelEl = [...cell.children].find((el) => el !== list && !el.matches('ul, ol, dl') && el.textContent.trim());
  const labelText = labelEl ? labelEl.textContent.trim() : 'Nutrition Info';
  if (labelEl) labelEl.remove();

  popoverCount += 1;
  const panelId = `columns-recipe-info-popover-${popoverCount}`;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'columns-recipe-info-toggle';
  button.textContent = labelText;
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', panelId);

  const panel = document.createElement('div');
  panel.className = 'columns-recipe-info-popover';
  panel.id = panelId;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', labelText);
  panel.hidden = true;
  while (cell.firstElementChild) panel.append(cell.firstElementChild);
  panel.querySelectorAll(':scope > ul > li, :scope > ol > li').forEach(decorateNutritionRow);

  const close = (returnFocus) => {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus();
  };

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'columns-recipe-info-close';
  closeButton.setAttribute('aria-label', `Close ${labelText}`);
  closeButton.addEventListener('click', () => close(true));
  panel.prepend(closeButton);

  button.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  });

  cell.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close(true);
  });

  document.addEventListener('click', (e) => {
    if (!cell.contains(e.target)) close(false);
  });

  cell.classList.add('columns-recipe-info-has-popover');
  cell.replaceChildren(button, panel);
  return true;
}

/**
 * Columns Recipe Info block
 * Label/value recipe summary shown as side-by-side groups between rules.
 * Each authored column is one group (e.g. Level+Total | Prep+Cook |
 * Yield+Nutrition Info); each row adds one item to every group. A cell that
 * holds a list becomes a toggle button revealing that list in a popover.
 */
export default function decorate(block) {
  // snapshot cells first: moving a cell into its group shifts row.children
  const rows = [...block.children].map((row) => [...row.children]);
  const groupCount = Math.max(0, ...rows.map((cells) => cells.length));

  const wrapper = document.createElement('div');
  wrapper.className = 'columns-recipe-info-groups';

  for (let i = 0; i < groupCount; i += 1) {
    const group = document.createElement('div');
    group.className = 'columns-recipe-info-group';

    rows.forEach((cells) => {
      const cell = cells[i];
      if (!cell || (!cell.textContent.trim() && !cell.querySelector('img'))) return;
      normaliseCell(cell);
      cell.className = 'columns-recipe-info-item';
      if (!decoratePopover(cell)) {
        cell.querySelectorAll(':scope > p').forEach(decorateLabel);
      }
      group.append(cell);
    });

    if (group.children.length) wrapper.append(group);
  }

  block.classList.add(`columns-recipe-info-${wrapper.children.length}-cols`);
  block.replaceChildren(wrapper);
}
