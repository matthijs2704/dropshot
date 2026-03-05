// Featured-duo layout: large hero (2/3 width) beside a supporting photo (1/3)
// Similar to side-by-side but unequal — the hero gets much more real estate,
// the supporting photo still breathes on its own rather than being buried in a grid.

import { applySmartFit }  from '../fit.js';
import { startKenBurns }  from '../transitions.js';
import { el, photoUrl }   from '../../shared/utils.js';

/** Layout descriptor for the dispatcher. */
export const layout = {
  name: 'featuredduo',
  minPhotos: 2,

  pick(cfg, helpers) {
    const heroP = helpers.pickAndClaimHero(cfg, { orientation: 'landscape' });
    const support = helpers.pickPhotos(1, cfg, heroP ? [heroP.id] : [], true, {
      orientation: 'portrait',
      enforceOrientation: false,
      orientationBoost: 1.25,
      avoidRecentMs: 120_000,
      allowRecentFallback: true,
    });
    return { photos: [heroP, support[0] || null].filter(Boolean) };
  },

  build(picked) {
    return buildFeaturedDuo(picked.photos);
  },
};

/**
 * @param {Object[]} photos - Expects at least 2 photos; [0] = hero, [1] = support
 * @returns {{ el, visibleIds, startMotion }}
 */
export function buildFeaturedDuo(photos) {
  const rootEl = el('div', { cls: 'layout layout-featuredduo' });

  const visibleIds = [];
  const imgs       = [];

  const defs = [
    { portrait: false },  // hero slot — landscape-biased, large
    { portrait: true  },  // support slot — portrait-biased, tall narrow
  ];

  for (let i = 0; i < 2; i++) {
    const photo   = photos[i];
    const def     = defs[i];
    const slot    = el('div', { cls: 'fd-slot' });

    if (photo) {
      const img = el('img', { src: photoUrl(photo), alt: photo.name });
      applySmartFit(img, photo, def.portrait);
      slot.appendChild(img);
      slot.dataset.photoId = photo.id;
      slot.dataset.isHero  = i === 0 ? '1' : '0';
      visibleIds.push(photo.id);
      imgs.push(img);
    } else {
      slot.classList.add('fd-slot-empty');
    }

    rootEl.appendChild(slot);
  }

  return {
    el: rootEl,
    visibleIds,
    startMotion: (durationMs) => {
      for (const img of imgs) startKenBurns(img, durationMs);
    },
  };
}
