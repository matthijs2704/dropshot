/**
 * Slide renderer: article
 *
 * Combines a headline, body text and an image in one of three layouts:
 *
 *   image-left   — photo fills left half; text block sits on the right
 *   image-top    — photo fills the top ~45 % of the screen; text below
 *   image-bg     — photo fills the whole screen with a dark scrim; text overlaid
 *
 * imageSource:
 *   'upload'  — slide.imageFilename, served from /slide-assets/images/
 *   'pool'    — no imageFilename; the renderer requests a random ready photo
 *               from the server and uses its cached display URL
 *
 * All colours/fonts honour CSS custom property overrides (theme system).
 */

import { el, photoUrl, slideDurationMs, slideDelay } from '../../shared/utils.js';

// ---------------------------------------------------------------------------
// Layout builders
// ---------------------------------------------------------------------------

/**
 * image-left: two columns via CSS grid.
 * Left = photo (object-fit cover), right = text.
 */
function _buildImageLeft(imgEl, textEl) {
  return el('div', { cls: 'slide-article al-image-left' },
    el('div', { cls: 'al-img-wrap' }, imgEl),
    el('div', { cls: 'al-text-wrap' }, textEl),
  );
}

/**
 * image-top: photo fills top 45 %, text sits in the bottom 55 %.
 */
function _buildImageTop(imgEl, textEl) {
  const imgWrap = el('div', { cls: 'al-img-wrap' }, imgEl);
  // Thin accent stripe between image and text (positioned via CSS)
  imgWrap.appendChild(el('div', { cls: 'al-stripe' }));
  return el('div', { cls: 'slide-article al-image-top' },
    imgWrap,
    el('div', { cls: 'al-text-wrap' }, textEl),
  );
}

/**
 * image-bg: photo is full-bleed background; dark gradient scrim + text on top.
 */
function _buildImageBg(imgEl, textEl) {
  imgEl.className = 'al-bg-img';
  return el('div', { cls: 'slide-article al-image-bg' },
    imgEl,
    el('div', { cls: 'al-scrim' }),
    el('div', { cls: 'al-text-wrap' }, textEl),
  );
}

// ---------------------------------------------------------------------------
// Text block (shared by all layouts)
// ---------------------------------------------------------------------------

function _buildTextBlock(slide) {
  const block = el('div', { cls: 'al-text-block' });
  if (slide.title) {
    block.appendChild(el('div', { cls: 'al-title', text: slide.title }));
    if (slide.body) block.appendChild(el('div', { cls: 'al-rule' }));
  }
  if (slide.body) block.appendChild(el('div', { cls: 'al-body', text: slide.body }));
  return block;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @param {object} slide
 * @returns {Promise<{ el: HTMLElement, play: () => Promise<void> }>}
 */
export async function buildArticleSlide(slide) {
  const layout = slide.layout || 'image-left';

  // ── Image element ─────────────────────────────────────────────────────────
  const img = el('img', { cls: 'al-img', alt: slide.title || '' });

  if (slide.imageSource === 'pool' || !slide.imageFilename) {
    // Pick a random ready photo from the server's photo list
    try {
      const res   = await fetch('/api/photos?status=ready&limit=1&random=1');
      const data  = await res.json();
      const photo = Array.isArray(data) ? data[0] : (data.photos?.[0]);
      if (photo && photoUrl(photo)) {
        img.src = photoUrl(photo);
      }
    } catch { /* img stays blank — graceful degradation */ }
  } else {
    img.src = `/slide-assets/images/${encodeURIComponent(slide.imageFilename)}`;
  }

  // ── Text block ────────────────────────────────────────────────────────────
  const textBlock = _buildTextBlock(slide);

  // ── Assemble layout ───────────────────────────────────────────────────────
  let rootEl;
  if (layout === 'image-top')     rootEl = _buildImageTop(img, textBlock);
  else if (layout === 'image-bg') rootEl = _buildImageBg(img, textBlock);
  else                            rootEl = _buildImageLeft(img, textBlock);  // default

  const durationMs = slideDurationMs(slide, 12);

  return {
    el:   rootEl,
    play: () => slideDelay(durationMs),
  };
}
