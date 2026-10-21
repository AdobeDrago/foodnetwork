/**
 * Cards Links block
 * Text-only link tiles (e.g. "Related Pages"). One link per row or per cell;
 * every authored link becomes one tile in a centred grid (3 per row on desktop).
 * Rows/cells without a link are ignored.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'cards-links-list';

  [...block.children].forEach((row) => {
    const cells = row.children.length ? [...row.children] : [row];
    cells.forEach((cell) => {
      cell.querySelectorAll('a[href]').forEach((link) => {
        const li = document.createElement('li');
        li.className = 'cards-links-card';
        link.className = 'cards-links-link';
        li.append(link);
        ul.append(li);
      });
    });
  });

  block.replaceChildren(ul);
}
