import { recipePath } from '../../scripts/recipe-data.js';

const STORAGE_PREFIX = 'fn-private-note:';
const DEFAULT_TITLE = 'My Private Notes';
const DEFAULT_ADD_LABEL = 'Add a Note';

let instanceCount = 0;

/**
 * Key for this page's note: the canonical recipe path, else the page path with
 * a /content preview prefix, `.html` and trailing slashes removed.
 * @returns {string}
 */
function storageKey() {
  const path = recipePath() || window.location.pathname
    .replace(/^\/content(?=\/)/, '')
    .replace(/\.html$/, '')
    .replace(/\/+$/, '');
  return `${STORAGE_PREFIX}${path || '/'}`;
}

function readNote(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return '';
    const data = JSON.parse(raw);
    return typeof data?.text === 'string' ? data.text : '';
  } catch (error) {
    return '';
  }
}

function writeNote(key, text) {
  try {
    if (text) {
      window.localStorage.setItem(key, JSON.stringify({ text, updated: new Date().toISOString() }));
    } else {
      window.localStorage.removeItem(key);
    }
    return true;
  } catch (error) {
    return false;
  }
}

function button(className, label, type = 'button') {
  const btn = document.createElement('button');
  btn.type = type;
  btn.className = className;
  btn.textContent = label;
  return btn;
}

/**
 * Row 1: heading ("My Private Notes"). Row 2: Add a Note label.
 * @param {Element} block
 * @returns {{ heading: HTMLElement, addLabel: string }}
 */
function readAuthored(block) {
  const [titleRow, labelRow] = [...block.children];
  let heading = titleRow?.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) {
    heading = document.createElement('h2');
    heading.textContent = titleRow?.textContent.trim().replace(/\s+/g, ' ') || DEFAULT_TITLE;
  }
  const addLabel = labelRow?.textContent.trim().replace(/\s+/g, ' ') || DEFAULT_ADD_LABEL;
  return { heading, addLabel };
}

export default function decorate(block) {
  instanceCount += 1;
  const uid = `private-notes-${instanceCount}`;
  const key = storageKey();
  const { heading, addLabel } = readAuthored(block);

  heading.classList.add('private-notes-title');
  if (!heading.id) heading.id = `${uid}-title`;
  block.setAttribute('role', 'region');
  block.setAttribute('aria-labelledby', heading.id);

  const body = document.createElement('div');
  body.className = 'private-notes-body';

  // Add a Note: grey circle with a + icon, then the label
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'private-notes-add';
  add.setAttribute('aria-expanded', 'false');
  add.setAttribute('aria-controls', `${uid}-form`);
  const icon = document.createElement('span');
  icon.className = 'private-notes-add-icon';
  icon.setAttribute('aria-hidden', 'true');
  const addText = document.createElement('span');
  addText.className = 'private-notes-add-label';
  addText.textContent = addLabel;
  add.append(icon, addText);

  // inline editor
  const form = document.createElement('form');
  form.className = 'private-notes-form';
  form.id = `${uid}-form`;
  form.hidden = true;
  const label = document.createElement('label');
  label.className = 'private-notes-label';
  label.htmlFor = `${uid}-text`;
  label.textContent = 'Your private note';
  const hint = document.createElement('p');
  hint.className = 'private-notes-hint';
  hint.id = `${uid}-hint`;
  hint.textContent = 'Only you can see this note. It is saved in this browser.';
  const textarea = document.createElement('textarea');
  textarea.className = 'private-notes-textarea';
  textarea.id = `${uid}-text`;
  textarea.name = 'note';
  textarea.rows = 4;
  textarea.setAttribute('aria-describedby', hint.id);
  const formActions = document.createElement('div');
  formActions.className = 'private-notes-actions';
  const save = button('private-notes-save', 'Save', 'submit');
  const cancel = button('private-notes-cancel', 'Cancel');
  formActions.append(save, cancel);
  form.append(label, textarea, hint, formActions);

  // saved note
  const saved = document.createElement('div');
  saved.className = 'private-notes-saved';
  saved.hidden = true;
  const text = document.createElement('p');
  text.className = 'private-notes-text';
  const savedActions = document.createElement('div');
  savedActions.className = 'private-notes-actions';
  const edit = button('private-notes-edit', 'Edit');
  edit.setAttribute('aria-label', 'Edit note');
  const remove = button('private-notes-delete', 'Delete');
  remove.setAttribute('aria-label', 'Delete note');
  savedActions.append(edit, remove);
  saved.append(text, savedActions);

  const status = document.createElement('p');
  status.className = 'private-notes-status';
  status.setAttribute('role', 'status');

  body.append(add, form, saved, status);
  block.replaceChildren(heading, body);

  let note = readNote(key);
  let editing = false;

  const announce = (message) => {
    status.textContent = '';
    if (message) window.requestAnimationFrame(() => { status.textContent = message; });
  };

  const render = () => {
    const hasNote = !!note;
    block.classList.toggle('private-notes-has-note', hasNote);
    form.hidden = !editing;
    add.hidden = hasNote;
    add.setAttribute('aria-expanded', String(editing && !hasNote));
    saved.hidden = !hasNote || editing;
    text.textContent = note;
  };

  const open = () => {
    editing = true;
    textarea.value = note;
    render();
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  };

  const close = () => {
    editing = false;
    render();
    (note ? edit : add).focus();
  };

  add.addEventListener('click', () => {
    if (editing) close();
    else open();
  });
  edit.addEventListener('click', open);
  cancel.addEventListener('click', close);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = textarea.value.trim();
    if (!value) {
      textarea.focus();
      return;
    }
    if (!writeNote(key, value)) {
      announce('Your note could not be saved in this browser.');
      return;
    }
    note = value;
    close();
    announce('Note saved.');
  });

  remove.addEventListener('click', () => {
    writeNote(key, '');
    note = '';
    close();
    announce('Note deleted.');
  });

  // keep other tabs of the same recipe in sync
  window.addEventListener('storage', (e) => {
    if (e.key !== key || editing) return;
    note = readNote(key);
    render();
  });

  render();
}
