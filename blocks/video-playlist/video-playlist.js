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
 * Food Network recipe pages play inline too: the page's video asset is
 * resolved and streamed the same way foodnetwork.com starts it.
 * Any other video URL is linked so the poster opens the video page.
 *
 * Option `rail`: the playlist is a vertical rail to the right of the player
 * (desktop) and the title/duration/CTA/description row is not rendered.
 */

const DURATION_RE = /^\(?\d{1,2}:\d{2}(?::\d{2})?\)?$/;
const MEDIA_RE = /\.(mp4|webm|m3u8|mov|ogg)(\?|$)/i;
const ASSET_PATH_RE = /\/etc\/sni-asset\/food\/videos\/[0-9/]+/;
const PLAYBACK_ORIGIN = 'https://www.foodnetwork.com';
const HLS_MODULE = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/+esm';

const streams = new Map();
const hlsByStage = new WeakMap();
let playToken = 0;

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

function isFoodNetworkHost(hostname) {
  return /(^|\.)foodnetwork\.com$/i.test(hostname);
}

function canPlayInline(href) {
  if (!href) return false;
  if (getEmbedType(href) || ASSET_PATH_RE.test(href) || /\.m3u8(\?|$)/i.test(href)) return true;
  try {
    return isFoodNetworkHost(new URL(href, window.location.href).hostname);
  } catch {
    return false;
  }
}

function playbackUrl(path) {
  return `${PLAYBACK_ORIGIN}/apps/api/playback?path=${path}`;
}

async function lookupStream(href) {
  const kind = getEmbedType(href);
  if (kind) return { kind, src: href };
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (/\.m3u8(\?|$)/i.test(url.pathname)) return { kind: 'hls', src: url.href };
  const fromUrl = url.href.match(ASSET_PATH_RE);
  if (fromUrl && (url.searchParams.has('path') || url.pathname.includes('/apps/api/playback'))) {
    return { kind: 'hls', src: playbackUrl(fromUrl[0]) };
  }
  if (!isFoodNetworkHost(url.hostname)) return null;
  const response = await fetch(url.href);
  if (!response.ok) return null;
  const asset = (await response.text()).match(ASSET_PATH_RE);
  if (!asset) return null;
  return { kind: 'hls', src: playbackUrl(asset[0]) };
}

async function resolveStream(href) {
  if (streams.has(href)) return streams.get(href);
  const stream = await lookupStream(href);
  if (stream) streams.set(href, stream);
  return stream;
}

function stopStage(stage) {
  const hls = hlsByStage.get(stage);
  if (!hls) return;
  hls.destroy();
  hlsByStage.delete(stage);
}

function startVideo(video) {
  return video.play().catch(() => {
    video.muted = true;
    return video.play();
  });
}

async function attachHls(stage, video, src) {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
    await startVideo(video);
    return;
  }
  const { default: Hls } = await import(HLS_MODULE);
  if (!Hls.isSupported()) {
    video.src = src;
    await startVideo(video);
    return;
  }
  const hls = new Hls();
  hlsByStage.set(stage, hls);
  hls.loadSource(src);
  hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED, () => { startVideo(video); });
}

const SKIP_SECONDS = 10;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const padded = [minutes, secs].map((value) => String(value).padStart(2, '0'));
  if (hours > 0) padded.unshift(String(hours));
  return padded.join(':');
}

function captionTracks(video) {
  return [...video.textTracks].filter((track) => track.kind === 'subtitles' || track.kind === 'captions');
}

function mountControls(player, video) {
  const controls = document.createElement('div');
  controls.className = 'video-playlist-controls';
  controls.innerHTML = `
    <div class="video-playlist-controls-top">
      <button type="button" class="video-playlist-volume" aria-label="Mute">
        <svg class="icon icon--volume-full" viewBox="0 0 27 18" aria-hidden="true"><g fill="none" fill-rule="evenodd"><g transform="translate(0 1)" fill="#fff"><rect x="0" y="4" width="7" height="8" rx="0.75"></rect><path d="M4.28 4.57 8.78.97A.75.75 0 0 1 10 1.56v12.88a.75.75 0 0 1-1.22.63L4.28 11.43A.75.75 0 0 1 4 10.84V5.16c0-.23.1-.44.28-.59Z"></path></g><g transform="translate(18.49 9.24) rotate(45) translate(-18.49 -9.24) translate(12.49 3.24)" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="1.5"><path d="M11.44 11.44C11.44 5.22 6.4.19.19.19"></path><path d="M.19 3.94c4.14 0 7.5 3.36 7.5 7.5"></path><path d="M.19 7.69c2.07 0 3.75 1.68 3.75 3.75"></path></g></g></svg>
        <svg class="icon icon--volume-muted" viewBox="0 0 27 18" aria-hidden="true"><g fill="none" fill-rule="evenodd"><g transform="translate(0 1)" fill="#fff"><rect x="0" y="4" width="7" height="8" rx="0.75"></rect><path d="M4.28 4.57 8.78.97A.75.75 0 0 1 10 1.56v12.88a.75.75 0 0 1-1.22.63L4.28 11.43A.75.75 0 0 1 4 10.84V5.16c0-.23.1-.44.28-.59Z"></path></g><g transform="translate(13 6)" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="1.5"><line x1="6.24" y1="0" x2="0" y2="6.24"></line><line x1="6.24" y1="6.24" x2="0" y2="0"></line></g></g></svg>
      </button>
      <button type="button" class="video-playlist-cc" aria-label="Closed captions" aria-pressed="false">
        <svg viewBox="0 0 24 18" aria-hidden="true"><g fill="none" transform="translate(1 1)"><rect width="22" height="16" stroke="#fff" stroke-width="1.5" rx="1.5"></rect><path fill="#fff" transform="translate(4 4.5)" d="M12.92 2.49c-.11-.16-.26-.29-.46-.39-.2-.1-.41-.15-.63-.15-.56 0-.99.16-1.3.5-.31.33-.47.77-.47 1.31 0 .54.16.97.47 1.31.3.33.74.5 1.3.5.24 0 .45-.06.63-.16.18-.11.33-.24.46-.39l1.45 1.53c-.34.35-.75.6-1.21.74-.47.14-.91.21-1.33.21-.55 0-1.07-.09-1.55-.26-.49-.18-.91-.43-1.27-.76-.36-.33-.64-.72-.84-1.18-.21-.46-.31-.98-.31-1.55 0-.57.1-1.08.31-1.54.2-.46.48-.86.84-1.19.36-.32.78-.58 1.27-.75.48-.18 1-.27 1.55-.27.42 0 .86.07 1.33.21.46.15.87.4 1.21.75L12.92 2.49zM5.06 2.49c-.11-.16-.26-.29-.46-.39-.2-.1-.41-.15-.63-.15-.56 0-.99.16-1.3.5-.31.33-.47.77-.47 1.31 0 .54.16.97.47 1.31.3.33.74.5 1.3.5.24 0 .45-.06.63-.16.18-.11.33-.24.46-.39l1.45 1.53c-.34.35-.75.6-1.21.74-.47.14-.91.21-1.33.21-.55 0-1.07-.09-1.55-.26-.49-.18-.91-.43-1.27-.76-.36-.33-.64-.72-.84-1.18C.1 4.83 0 4.32 0 3.75c0-.57.1-1.08.31-1.54.2-.46.48-.86.84-1.19.36-.32.78-.58 1.27-.75.48-.18 1-.27 1.55-.27.42 0 .86.07 1.33.21.46.15.87.4 1.21.75L5.06 2.49z"></path></g></svg>
      </button>
      <button type="button" class="video-playlist-fullscreen" aria-label="Fullscreen">
        <svg viewBox="0 0 22 21" aria-hidden="true"><g fill="none" transform="translate(1 1)"><path d="m2.02.6 3.63 2-2.27 3.45" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" transform="matrix(-.53 -.85 .85 -.53 4.04 9.34)"></path><rect fill="#fff" height="7.8" rx=".6" width="1.2" x="4.8" y="1.2" transform="matrix(.68 -.73 .73 .68 -1.01 6.57)"></rect><path d="m2.02.6 3.63 2-2.27 3.45" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" transform="matrix(.53 .85 -.85 .53 15.96 9.66)"></path><rect fill="#fff" height="7.8" rx=".6" width="1.2" x="4.8" y="1.2" transform="matrix(-.68 .73 -.73 -.68 21.01 12.43)"></rect><rect height="19" rx="1.5" stroke="#fff" stroke-width="1.5" width="20"></rect></g></svg>
      </button>
    </div>
    <div class="video-playlist-controls-center">
      <button type="button" class="video-playlist-rewind" aria-label="Rewind 10 seconds">
        <span class="video-playlist-scrub-label">- 10 sec</span>
        <svg viewBox="0 0 40 43" aria-hidden="true"><g fill="none" fill-rule="evenodd"><g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M20.46 3.03 26.52 6.37 22.73 12.12" transform="translate(-5 -2) matrix(-1 0 0 1 50 0)"></path><path d="M25.28 6.82a18.47 18.47 0 1 0 18.47 18.46" transform="translate(-5 -2) matrix(-1 0 0 1 50 0)"></path></g><path fill="#fff" d="M24.45 30.85v-2.2h-3.33v-9.99h-2.03c-.58.97-2.11 1.89-4.05 2.45v2.46c.88-.36 1.82-.86 3.33-1.78v6.86h-3.64v2.2h9.72zm5.81.18c1.44 0 2.65-.59 3.42-1.66.83-1.15 1.3-2.77 1.3-4.44 0-3.84-1.84-6.27-4.72-6.27-1.42 0-2.64.61-3.42 1.71-.79 1.12-1.24 2.77-1.24 4.48 0 1.77.47 3.37 1.31 4.56.76 1.04 1.95 1.62 3.35 1.62zm.05-2.07c-1.33 0-1.8-1.1-1.8-4.21 0-2.95.47-4.07 1.75-4.07 1.35 0 1.82 1.12 1.82 4.27 0 2.84-.52 4.01-1.77 4.01z" transform="translate(-5 -2)"></path></g></svg>
      </button>
      <button type="button" class="video-playlist-toggle" aria-label="Pause">
        <svg class="icon icon--play" viewBox="0 0 67 67" aria-hidden="true"><g fill="none" transform="translate(1 1)"><circle cx="32.5" cy="32.5" r="32.5" stroke="#fff" stroke-width="2"></circle><path fill="#fff" d="M27.48 41.95 41.72 33.34a.975.975 0 0 0 .33-1.34c-.08-.13-.2-.25-.33-.33L27.48 23.06a.975.975 0 0 0-1.34.33 1 1 0 0 0-.14.5v17.23c0 .53.44.97.98.97.17 0 .35-.05.5-.14z"></path></g></svg>
        <svg class="icon icon--pause" viewBox="0 0 67 67" aria-hidden="true"><g fill="none" transform="translate(1 1)"><circle cx="32.5" cy="32.5" r="32.5" stroke="#fff" stroke-width="2"></circle><g fill="#fff" transform="translate(24 21)"><rect width="6" height="23" rx="1"></rect><rect width="6" height="23" x="11" rx="1"></rect></g></g></svg>
      </button>
      <button type="button" class="video-playlist-forward" aria-label="Fast forward 10 seconds">
        <span class="video-playlist-scrub-label">+ 10 sec</span>
        <svg viewBox="0 0 40 43" aria-hidden="true"><g fill="none" fill-rule="evenodd"><g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M20.46 3.03 26.52 6.37 22.73 12.12" transform="translate(-5 -2)"></path><path d="M25.28 6.82a18.47 18.47 0 1 0 18.47 18.46" transform="translate(-5 -2)"></path></g><path fill="#fff" d="M25.45 30.85v-2.2h-3.33v-9.99h-2.03c-.58.97-2.11 1.89-4.05 2.45v2.46c.88-.36 1.82-.86 3.33-1.78v6.86h-3.64v2.2h9.72zm5.81.18c1.44 0 2.65-.59 3.42-1.66.83-1.15 1.3-2.77 1.3-4.44 0-3.84-1.84-6.27-4.72-6.27-1.42 0-2.64.61-3.42 1.71-.79 1.12-1.24 2.77-1.24 4.48 0 1.77.47 3.37 1.31 4.56.76 1.04 1.95 1.62 3.35 1.62zm.05-2.07c-1.33 0-1.8-1.1-1.8-4.21 0-2.95.47-4.07 1.75-4.07 1.35 0 1.82 1.12 1.82 4.27 0 2.84-.52 4.01-1.77 4.01z" transform="translate(-5 -2)"></path></g></svg>
      </button>
    </div>
    <div class="video-playlist-controls-bottom">
      <time class="video-playlist-time">00:00</time>
      <div class="video-playlist-progress" role="slider" aria-label="Video progress" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" tabindex="0">
        <div class="video-playlist-progress-played"></div>
        <div class="video-playlist-progress-dot"></div>
      </div>
      <time class="video-playlist-time">00:00</time>
    </div>`;
  player.append(controls);

  const progress = controls.querySelector('.video-playlist-progress');
  const [elapsed, duration] = controls.querySelectorAll('.video-playlist-time');
  const toggle = controls.querySelector('.video-playlist-toggle');
  const captions = controls.querySelector('.video-playlist-cc');
  let hideTimer = 0;

  const syncProgress = () => {
    const length = Number.isFinite(video.duration) ? video.duration : 0;
    const ratio = length ? Math.min(1, video.currentTime / length) : 0;
    progress.style.setProperty('--progress', String(ratio));
    progress.setAttribute('aria-valuemax', String(Math.floor(length)));
    progress.setAttribute('aria-valuenow', String(Math.floor(video.currentTime)));
    elapsed.textContent = formatTime(video.currentTime);
    duration.textContent = formatTime(length);
  };

  const syncCaptions = () => {
    const on = captionTracks(video).some((track) => track.mode === 'showing');
    captions.classList.toggle('is-on', on);
    captions.setAttribute('aria-pressed', String(on));
  };

  const showControls = () => {
    controls.classList.add('is-visible');
    window.clearTimeout(hideTimer);
    if (!video.paused) {
      hideTimer = window.setTimeout(() => controls.classList.remove('is-visible'), 2500);
    }
  };

  const seekTo = (clientX) => {
    if (!Number.isFinite(video.duration)) return;
    const rect = progress.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
  };

  toggle.addEventListener('click', () => {
    if (video.paused) video.play();
    else video.pause();
  });
  controls.querySelector('.video-playlist-rewind').addEventListener('click', () => {
    video.currentTime = Math.max(0, video.currentTime - SKIP_SECONDS);
  });
  controls.querySelector('.video-playlist-forward').addEventListener('click', () => {
    const end = Number.isFinite(video.duration) ? video.duration : video.currentTime + SKIP_SECONDS;
    video.currentTime = Math.min(end, video.currentTime + SKIP_SECONDS);
  });
  controls.querySelector('.video-playlist-volume').addEventListener('click', () => {
    video.muted = !video.muted;
  });
  captions.addEventListener('click', () => {
    const tracks = captionTracks(video);
    if (!tracks.length) return;
    const showing = tracks.some((track) => track.mode === 'showing');
    tracks.forEach((track) => { track.mode = showing ? 'hidden' : 'disabled'; });
    if (!showing) tracks[0].mode = 'showing';
    syncCaptions();
  });
  controls.querySelector('.video-playlist-fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else player.requestFullscreen();
  });
  controls.addEventListener('click', (event) => {
    if (event.target.closest('button, .video-playlist-progress')) return;
    if (video.paused) video.play();
    else video.pause();
  });
  progress.addEventListener('pointerdown', (event) => {
    progress.setPointerCapture(event.pointerId);
    seekTo(event.clientX);
  });
  progress.addEventListener('pointermove', (event) => {
    if (progress.hasPointerCapture(event.pointerId)) seekTo(event.clientX);
  });
  progress.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') video.currentTime += SKIP_SECONDS;
    else if (event.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - SKIP_SECONDS);
  });

  video.addEventListener('timeupdate', syncProgress);
  video.addEventListener('loadedmetadata', syncProgress);
  video.addEventListener('durationchange', syncProgress);
  const token = playToken;
  const notifyPlayback = (state) => {
    if (token !== playToken) return;
    player.dispatchEvent(new CustomEvent('playlistplayback', { bubbles: true, detail: state }));
  };
  video.addEventListener('play', () => {
    if (token !== playToken) return;
    player.classList.remove('is-paused');
    toggle.setAttribute('aria-label', 'Pause');
    showControls();
    notifyPlayback('playing');
  });
  video.addEventListener('pause', () => {
    if (token !== playToken) return;
    player.classList.add('is-paused');
    toggle.setAttribute('aria-label', 'Play');
    showControls();
    notifyPlayback('paused');
  });
  video.addEventListener('volumechange', () => {
    player.classList.toggle('is-muted', video.muted);
    controls.querySelector('.video-playlist-volume')
      .setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute');
  });
  video.textTracks.addEventListener('addtrack', syncCaptions);
  player.addEventListener('mousemove', showControls);
  player.addEventListener('mouseleave', () => {
    if (!video.paused) controls.classList.remove('is-visible');
  });
  player.addEventListener('focusin', showControls);
  document.addEventListener('fullscreenchange', () => {
    const button = controls.querySelector('.video-playlist-fullscreen');
    const open = document.fullscreenElement === player;
    button.setAttribute('aria-label', open ? 'Exit fullscreen' : 'Fullscreen');
  });

  player.classList.toggle('is-paused', video.paused);
  player.classList.toggle('is-muted', video.muted);
  toggle.setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
  showControls();
  syncProgress();
}

async function playInStage(stage, href) {
  const token = playToken + 1;
  playToken = token;
  let stream = null;
  try {
    stream = await resolveStream(href);
  } catch {
    stream = null;
  }
  if (token !== playToken) return;
  if (!stream) {
    window.location.href = href;
    return;
  }
  stopStage(stage);
  const player = document.createElement('div');
  player.className = 'video-playlist-player';
  stage.replaceChildren(player);
  if (stream.kind !== 'hls') {
    player.append(buildPlayer(stream.src));
    return;
  }
  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  player.append(video);
  mountControls(player, video);
  try {
    await attachHls(stage, video, stream.src);
  } catch {
    if (token === playToken) window.location.href = href;
  }
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
  let playback = 'idle';
  let played = false;

  const activeTileIndex = () => {
    if (current >= 0) return current;
    if (playback !== 'idle' && tiles[0] && featured.href === tiles[0].href) return 0;
    return -1;
  };

  const syncTileStatus = () => {
    if (playback !== 'idle' || current >= 0) played = true;
    const active = activeTileIndex();
    tileEls.forEach((el, i) => {
      const status = el.querySelector('.video-playlist-tile-status');
      if (!status) return;
      if (i === active && playback === 'playing') status.textContent = 'Now Playing';
      else if (i === active && playback === 'paused') status.textContent = 'Resume';
      else if (i === 0 && !played) status.textContent = 'First Up';
      else status.textContent = '';
      if (i === active) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
  };

  stage.addEventListener('playlistplayback', (event) => {
    playback = event.detail;
    syncTileStatus();
  });

  const renderStage = (item, autoplay) => {
    stopStage(stage);
    stage.replaceChildren();
    const poster = optimize(item.picture?.cloneNode(true), '1200');
    const inline = canPlayInline(item.href);
    const wrapper = document.createElement(inline || !item.href ? 'div' : 'a');
    wrapper.className = 'video-playlist-poster';
    if (wrapper.tagName === 'A') wrapper.href = item.href;
    if (poster) wrapper.append(poster);
    if (item.href) {
      const play = document.createElement(inline ? 'button' : 'span');
      play.className = 'video-playlist-play';
      if (inline) play.type = 'button';
      play.setAttribute('aria-label', `Watch ${item.title || 'video'}`);
      play.textContent = 'Watch';
      wrapper.append(play);
    }
    stage.append(wrapper);

    if (inline) {
      wrapper.addEventListener('click', (event) => {
        event.preventDefault();
        playInStage(stage, item.href);
      });
      if (autoplay) playInStage(stage, item.href);
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
    if (autoplay) playback = 'playing';
    syncTileStatus();
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
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'video-playlist-tile-button';
      const thumb = document.createElement('span');
      thumb.className = 'video-playlist-tile-image';
      const status = document.createElement('span');
      status.className = 'video-playlist-tile-status';
      if (i === 0) status.textContent = 'First Up';
      const pic = optimize(tile.picture, '400');
      if (pic) thumb.append(pic);
      thumb.append(status);
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
        if (canPlayInline(tile.href)) select(i, true);
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
