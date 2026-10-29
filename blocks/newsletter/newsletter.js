const DEFAULT_SIGNUP_URL = 'https://www.foodnetwork.com/site/newsletter-sign-up';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PART_CLASSES = ['newsletter-intro', 'newsletter-legal', 'newsletter-withdraw'];

let formCount = 0;

/**
 * True when a row holds nothing but a single link whose text reads "Sign Up".
 * @param {Element} row
 * @returns {boolean}
 */
function isSignUpRow(row) {
  const links = row.querySelectorAll('a[href]');
  if (links.length !== 1) return false;
  const text = row.textContent.trim();
  return text === links[0].textContent.trim() && /sign\s*up/i.test(text);
}

function buildForm(signUpUrl) {
  formCount += 1;
  const inputId = `newsletter-email-${formCount}`;
  const errorId = `newsletter-error-${formCount}`;

  const form = document.createElement('form');
  form.className = 'newsletter-form';
  form.noValidate = true;

  const label = document.createElement('label');
  label.className = 'newsletter-label';
  label.htmlFor = inputId;
  label.textContent = 'Enter email address';

  const input = document.createElement('input');
  input.className = 'newsletter-input';
  input.id = inputId;
  input.type = 'email';
  input.name = 'email';
  input.required = true;
  input.autocomplete = 'email';
  input.placeholder = 'Enter email address';

  const button = document.createElement('button');
  button.className = 'newsletter-submit';
  button.type = 'submit';
  button.textContent = 'Sign Up';

  const fields = document.createElement('div');
  fields.className = 'newsletter-fields';
  fields.append(label, input, button);

  const error = document.createElement('p');
  error.className = 'newsletter-error';
  error.id = errorId;
  error.setAttribute('aria-live', 'polite');

  form.append(fields, error);

  const clearError = () => {
    error.textContent = '';
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  };
  input.addEventListener('input', clearError);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = input.value.trim();
    if (!email || !EMAIL_RE.test(email)) {
      error.textContent = 'Please enter a valid email address.';
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errorId);
      input.focus();
      return;
    }
    clearError();
    const target = new URL(signUpUrl, window.location.href);
    target.searchParams.set('email', email);
    window.location.assign(target.toString());
  });

  return form;
}

/**
 * Newsletter block
 * Rows: [intro], [legal text with links], [withdraw-consent text with link],
 * optional [Sign Up link]. JS inserts a labelled email field and Sign Up
 * button between the legal and withdraw paragraphs; a valid email navigates
 * to the Sign Up link (default foodnetwork.com sign-up page) with ?email=.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const signUpRow = rows.length > 1 && isSignUpRow(rows[rows.length - 1]) ? rows.pop() : null;
  const signUpUrl = signUpRow?.querySelector('a[href]')?.getAttribute('href') || DEFAULT_SIGNUP_URL;

  const body = document.createElement('div');
  body.className = 'newsletter-body';

  const parts = rows.filter((row) => row.textContent.trim() || row.querySelector('picture'));
  parts.forEach((row, index) => {
    const part = document.createElement('div');
    part.className = `newsletter-part ${PART_CLASSES[Math.min(index, PART_CLASSES.length - 1)]}`;
    [...row.children].forEach((cell) => {
      if (cell.firstElementChild) {
        while (cell.firstChild) part.append(cell.firstChild);
      } else if (cell.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = cell.textContent.trim();
        part.append(p);
      }
    });
    // authored links stay inline text links
    part.querySelectorAll('a.button').forEach((a) => a.classList.remove('button', 'primary', 'secondary'));
    part.querySelectorAll('.button-container').forEach((p) => p.classList.remove('button-container'));
    body.append(part);
  });

  const form = buildForm(signUpUrl);
  const anchorIndex = Math.min(1, body.children.length - 1);
  if (anchorIndex >= 0) body.children[anchorIndex].after(form);
  else body.append(form);

  block.replaceChildren(body);
}
