import { createOptimizedPicture } from '../../scripts/aem.js';

function unbutton(root) {
  root.querySelectorAll('a.button, .button-container').forEach((el) => {
    el.classList.remove('button', 'primary', 'secondary', 'button-container');
    if (!el.classList.length) el.removeAttribute('class');
  });
}

function isExternal(href) {
  try {
    return new URL(href, window.location.href).origin !== window.location.origin;
  } catch (error) {
    return false;
  }
}

function markOutbound(link) {
  if (!isExternal(link.href)) return;
  link.target = '_blank';
  link.rel = 'noopener sponsored';
}

/**
 * Cards Shop block
 * Product grid ("Tools You May Need"). One row per product:
 * picture | <p><a>product name</a></p><p>retailer / price</p>.
 * A final single-cell row without a picture is the disclaimer footer.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const last = rows[rows.length - 1];
  const disclaimerRow = rows.length > 0 && last.children.length <= 1
    && !last.querySelector('picture, img') && last.textContent.trim()
    ? rows.pop()
    : null;

  const ul = document.createElement('ul');
  ul.className = 'cards-shop-list';

  rows.forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-shop-card';
    [...row.children].forEach((cell) => {
      if (cell.querySelector('picture, img') && cell.textContent.trim() === '') {
        cell.className = 'cards-shop-card-image';
      } else if (cell.textContent.trim()) {
        cell.className = 'cards-shop-card-body';
      } else {
        return;
      }
      li.append(cell);
    });
    if (!li.children.length) return;
    unbutton(li);

    const body = li.querySelector('.cards-shop-card-body');
    const nameLink = body?.querySelector('a[href]');
    if (body) {
      [...body.children].forEach((el, index) => {
        if (nameLink && el.contains(nameLink)) el.classList.add('cards-shop-name');
        else if (el.querySelector('a[href]')) el.classList.add('cards-shop-cta');
        else el.classList.add(index === 0 && !nameLink ? 'cards-shop-name' : 'cards-shop-meta');
      });
      body.querySelectorAll('a[href]').forEach(markOutbound);
    }

    // the product image links to the product too (duplicate link hidden from AT)
    const image = li.querySelector('.cards-shop-card-image');
    const picture = image?.querySelector('picture');
    if (nameLink && picture && !picture.closest('a')) {
      const imageLink = document.createElement('a');
      imageLink.href = nameLink.href;
      imageLink.tabIndex = -1;
      imageLink.setAttribute('aria-hidden', 'true');
      markOutbound(imageLink);
      picture.replaceWith(imageLink);
      imageLink.append(picture);
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '500' }]));
  });

  block.replaceChildren(ul);

  if (disclaimerRow) {
    const footer = document.createElement('div');
    footer.className = 'cards-shop-disclaimer';
    const cell = disclaimerRow.firstElementChild || disclaimerRow;
    if (cell.firstElementChild) {
      while (cell.firstChild) footer.append(cell.firstChild);
    } else {
      const p = document.createElement('p');
      p.textContent = cell.textContent.trim();
      footer.append(p);
    }
    unbutton(footer);
    block.append(footer);
  }
}
