// Side-by-side layout: two photos share the screen equally

import { applySmartFit }  from '../fit.js';
import { startKenBurns }  from '../transitions.js';
import { el, photoUrl }   from '../../shared/utils.js';

/** Layout descriptor for the dispatcher. */
export const layout = {
  name: 'sidebyside',
  minPhotos: 2,

  pick(cfg, helpers) {
    const photos = helpers.pickPhotos(2, cfg, [], true, {
      orientation: 'portrait',
      enforceOrientation: false,
      orientationBoost: 1.25,
      avoidRecentMs: 120_000,
      allowRecentFallback: true,
    });
    return { photos };
  },

  build(picked) {
    return buildSideBySide(picked.photos);
  },
};

/**
 * Build a side-by-side layout element.
 *
 * @param {Object[]} photos - Expects exactly 2 photos
 * @returns {{ el: HTMLElement, visibleIds: string[], startMotion: Function }}
 */
export function buildSideBySide(photos) {
  const rootEl = el('div', { cls: 'layout layout-sidebyside' });

  const visibleIds = [];
  const imgs       = [];

  for (let i = 0; i < 2; i++) {
    const photo = photos[i];
    const slot  = el('div', { cls: 'sbs-slot' });

    if (photo) {
      const img = el('img', { src: photoUrl(photo), alt: photo.name });
      applySmartFit(img, photo, true); // each half-slot is portrait (≈0.89 ratio)
      slot.appendChild(img);
      slot.dataset.photoId = photo.id;
      visibleIds.push(photo.id);
      imgs.push(img);
    } else {
      slot.classList.add('sbs-slot-empty');
    }

    rootEl.appendChild(slot);
  }

  return {
    el: rootEl,
    visibleIds,
    /** Call after layout transition completes, passing layoutDuration. */
    startMotion: (durationMs) => {
      // Apply subtle Ken Burns to each panel with slightly different presets
      // so the two panels feel independent rather than mirrored.
      for (const img of imgs) startKenBurns(img, durationMs);
    },
  };
}
