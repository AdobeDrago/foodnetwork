export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });

    // wrap the row in the heading's link so image + text are clickable
    const link = row.querySelector('a[href]');
    if (link) {
      const { href } = link;
      const label = link.textContent.trim();
      // unwrap the heading anchor, keeping its text (avoid nested links)
      link.replaceWith(...link.childNodes);
      const anchor = document.createElement('a');
      anchor.className = 'columns-link';
      anchor.href = href;
      anchor.setAttribute('aria-label', label);
      while (row.firstElementChild) anchor.append(row.firstElementChild);
      row.append(anchor);
    }
  });
}
