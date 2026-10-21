import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Video Playlist block
 *
 * Row 1: poster image + video link (featured video).
 * Row 2 (optional, no image): title heading, duration ("4:02"), CTA link
 *   (e.g. "Get the Recipe") in its own paragraph, description paragraph.
 * Each further row is a playlist tile: thumbnail | duration, title, video link.
 *
 * YouTube, Vimeo and direct media files (mp4/webm/m3u8/mov) play inline.
 * Any other video URL is linked so the poster opens the video page.
 *
 * Option `rail`: the playlist is a vertical rail to the right of the player
 * (desktop) and the title/duration/CTA/description row is not rendered.
 */

const DURATION_RE = /^\(?\d{1,2}:\d{2}(?::\d{2})?\)?$/;
const MEDIA_RE = /\.(mp4|webm|m3u8|mov|ogg)(\?|$)/i;

function isUrlText(text) {
  return /^(https?:)?\/\//i.test(text.trim());
}

function isLinkOnly(el) {
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && el.textContent.trim() === links[0].textContent.trim();
}

function getEmbedType(href) {
  if (!href) return null;
  if (/youtube\.com|youtu\.be/i.test(href)) return 'youtube';
  if (/vimeo\.com/i.test(href)) return 'vimeo';
  if (MEDIA_RE.test(href)) return 'file';
  return null;
}

function buildPlayer(href) {
  const type = getEmbedType(href);
  const url = new URL(href, window.location.href);
  if (type === 'file') {
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.src = url.href;
    return video;
  }
  let src;
  if (type === 'youtube') {
    const id = url.hostname.includes('youtu.be')
      ? url.pathname.split('/')[1]
      : url.searchParams.get('v') || url.pathname.split('/').pop();
    src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&autoplay=1`;
  } else {
    const id = url.pathname.split('/').filter(Boolean).pop();
    src = `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1`;
  }
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = 'Video player';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  return iframe;
}

function parseDetails(cell) {
  const details = {
    title: null, duration: null, cta: null, description: [],
  };
  if (!cell) return details;
  [...cell.children].forEach((el) => {
    const text = el.textContent.trim();
    if (!text) return;
    if (/^H[1-6]$/.test(el.tagName) && !details.title) {
      details.title = el;
    } else if (DURATION_RE.test(text) && !details.duration) {
      details.duration = text.replace(/[()]/g, '');
    } else if (el.tagName === 'P' && isLinkOnly(el) && !details.cta) {
      details.cta = el.querySelector('a');
    } else {
      details.description.push(el);
    }
  });
  return details;
}

function parseTile(row) {
  const picture = row.querySelector('picture');
  const link = row.querySelector('a[href]');
  let title = row.querySelector('h1, h2, h3, h4, h5, h6')?.textContent.trim() || '';
  let duration = '';
  row.querySelectorAll('p').forEach((p) => {
    const text = p.textContent.trim();
    if (!text || p.querySelector('picture')) return;
    if (DURATION_RE.test(text)) duration = text.replace(/[()]/g, '');
    else if (!title && !(isLinkOnly(p) && isUrlText(text))) title = text;
  });
  if (!title && link && !isUrlText(link.textContent)) title = link.textContent.trim();
  return {
    picture, href: link?.href || '', title, duration,
  };
}

function optimize(picture, width) {
  const img = picture?.querySelector('img');
  if (!img) return picture;
  return createOptimizedPicture(img.src, img.alt, false, [{ width }]);
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const featuredRow = rows.shift();
  const featured = parseTile(featuredRow);
  const detailsRow = rows.length && !rows[0].querySelector('picture') ? rows.shift() : null;
  const details = parseDetails(detailsRow?.querySelector(':scope > div'));
  const tiles = rows.map(parseTile).filter((t) => t.picture || t.href);

  // stage: poster + play control, swapped for the player on click
  const stage = document.createElement('div');
  stage.className = 'video-playlist-stage';

  // info: title, duration, CTA, description
  const info = document.createElement('div');
  info.className = 'video-playlist-info';
  const header = document.createElement('div');
  header.className = 'video-playlist-header';
  const titleEl = details.title || document.createElement('h3');
  titleEl.classList.add('video-playlist-title');
  if (!details.title) titleEl.textContent = featured.title;
  const featuredTitleHTML = details.title ? titleEl.innerHTML : null;
  const durationEl = document.createElement('span');
  durationEl.className = 'video-playlist-duration';
  header.append(titleEl, durationEl);
  info.append(header);
  let ctaEl = null;
  if (details.cta) {
    ctaEl = document.createElement('p');
    ctaEl.className = 'video-playlist-cta';
    ctaEl.append(details.cta);
    info.append(ctaEl);
  }
  const descEl = document.createElement('div');
  descEl.className = 'video-playlist-description';
  descEl.append(...details.description);
  if (details.description.length) info.append(descEl);

  let current = -1;
  let tileEls = [];

  const renderStage = (item, autoplay) => {
    stage.replaceChildren();
    const poster = optimize(item.picture?.cloneNode(true), '1200');
    const type = getEmbedType(item.href);
    const wrapper = document.createElement(type || !item.href ? 'div' : 'a');
    wrapper.className = 'video-playlist-poster';
    if (wrapper.tagName === 'A') wrapper.href = item.href;
    if (poster) wrapper.append(poster);
    if (item.href) {
      const play = document.createElement(type ? 'button' : 'span');
      play.className = 'video-playlist-play';
      if (type) play.type = 'button';
      play.setAttribute('aria-label', `Watch ${item.title || 'video'}`);
      play.textContent = 'Watch';
      wrapper.append(play);
    }
    stage.append(wrapper);

    const play = () => {
      const player = document.createElement('div');
      player.className = 'video-playlist-player';
      player.append(buildPlayer(item.href));
      stage.replaceChildren(player);
    };
    if (type) {
      wrapper.addEventListener('click', play, { once: true });
      if (autoplay) play();
    }
  };

  const select = (index, autoplay) => {
    current = index;
    const item = index < 0 ? featured : tiles[index];
    renderStage(item, autoplay);
    const isFeatured = index < 0;
    if (isFeatured && featuredTitleHTML !== null) titleEl.innerHTML = featuredTitleHTML;
    else titleEl.textContent = item.title;
    durationEl.textContent = (isFeatured ? details.duration || featured.duration : item.duration) || '';
    durationEl.hidden = !durationEl.textContent;
    if (ctaEl) ctaEl.hidden = !isFeatured;
    descEl.hidden = !isFeatured;
    tileEls.forEach((el, i) => {
      if (i === current) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
  };

  // option "rail": playlist is a vertical rail beside the player, no info row
  if (block.classList.contains('rail')) block.replaceChildren(stage);
  else block.replaceChildren(stage, info);

  // featured row only (e.g. recipe lead video): the title is kept for
  // assistive tech but not shown under the poster
  if (!detailsRow && !tiles.length) block.classList.add('video-playlist-featured-only');

  if (tiles.length) {
    const list = document.createElement('ul');
    list.className = 'video-playlist-list';
    tileEls = tiles.map((tile, i) => {
      const li = document.createElement('li');
      li.className = 'video-playlist-tile';
      if (i === 0) li.classList.add('video-playlist-tile-first');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'video-playlist-tile-button';
      const thumb = document.createElement('span');
      thumb.className = 'video-playlist-tile-image';
      const pic = optimize(tile.picture, '400');
      if (pic) thumb.append(pic);
      if (tile.duration) {
        const d = document.createElement('span');
        d.className = 'video-playlist-tile-duration';
        d.textContent = tile.duration;
        thumb.append(d);
      }
      const label = document.createElement('span');
      label.className = 'video-playlist-tile-title';
      label.textContent = tile.title;
      btn.append(thumb, label);
      btn.addEventListener('click', () => {
        if (getEmbedType(tile.href)) select(i, true);
        else if (tile.href) window.location.href = tile.href;
      });
      li.append(btn);
      list.append(li);
      return li;
    });
    block.append(list);
  }

  select(-1, false);
}
