// Fullscreen layout: one photo fills the entire screen

import { applySmartFit }  from '../fit.js';
import { startKenBurns }  from '../transitions.js';

/**
 * Build a fullscreen layout element.
 *
 * @param {Object} photo
 * @returns {{ el: HTMLElement, visibleIds: string[], startMotion: Function }}
 */
export function buildFullscreen(photo) {
  const el = document.createElement('div');
  el.className = 'layout layout-fullscreen';

  if (!photo) {
    return { el, visibleIds: [], startMotion: () => {} };
  }

  const wrap = document.createElement('div');
  wrap.className = 'fs-wrap';

  const img = document.createElement('img');
  img.src   = photo.displayUrl || photo.url;
  img.alt   = photo.name;
  applySmartFit(img, photo, false); // fullscreen slot is always landscape
  wrap.appendChild(img);
  el.appendChild(wrap);

  return {
    el,
    visibleIds: [photo.id],
    /** Call after the layout transition completes, passing layoutDuration. */
    startMotion: (durationMs) => startKenBurns(img, durationMs),
  };
}
