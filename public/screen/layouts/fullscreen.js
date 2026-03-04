// Fullscreen layout: one photo fills the entire screen

import { applySmartFit }       from '../fit.js';
import { startKenBurns }       from '../transitions.js';
import { el, photoUrl }        from '../../shared/utils.js';

/**
 * Build a fullscreen layout element.
 *
 * @param {Object} photo
 * @returns {{ el: HTMLElement, visibleIds: string[], startMotion: Function }}
 */
export function buildFullscreen(photo) {
  const rootEl = el('div', { cls: 'layout layout-fullscreen' });

  if (!photo) {
    return { el: rootEl, visibleIds: [], startMotion: () => {} };
  }

  const wrap = el('div', { cls: 'fs-wrap' });
  const img  = el('img', { src: photoUrl(photo), alt: photo.name });
  applySmartFit(img, photo, false); // fullscreen slot is always landscape
  wrap.appendChild(img);
  rootEl.appendChild(wrap);

  return {
    el: rootEl,
    visibleIds: [photo.id],
    /** Call after the layout transition completes, passing layoutDuration. */
    startMotion: (durationMs) => startKenBurns(img, durationMs),
  };
}
