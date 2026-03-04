// Featured-duo layout: large hero (2/3 width) beside a supporting photo (1/3)
// Similar to side-by-side but unequal — the hero gets much more real estate,
// the supporting photo still breathes on its own rather than being buried in a grid.

import { applySmartFit } from '../fit.js';
import { startKenBurns } from '../transitions.js';
import { photoUrl }      from '../../shared/utils.js';

/**
 * @param {Object[]} photos - Expects at least 2 photos; [0] = hero, [1] = support
 * @returns {{ el, visibleIds, startMotion }}
 */
export function buildFeaturedDuo(photos) {
  const el = document.createElement('div');
  el.className = 'layout layout-featuredduo';

  const visibleIds = [];
  const imgs       = [];

  const defs = [
    { portrait: false },  // hero slot — landscape-biased, large
    { portrait: true  },  // support slot — portrait-biased, tall narrow
  ];

  for (let i = 0; i < 2; i++) {
    const photo   = photos[i];
    const def     = defs[i];
    const slot    = document.createElement('div');
    slot.className = 'fd-slot';

    if (photo) {
      const img = document.createElement('img');
      img.src   = photoUrl(photo);
      img.alt   = photo.name;
      applySmartFit(img, photo, def.portrait);
      slot.appendChild(img);
      slot.dataset.photoId = photo.id;
      slot.dataset.isHero  = i === 0 ? '1' : '0';
      visibleIds.push(photo.id);
      imgs.push(img);
    } else {
      slot.classList.add('fd-slot-empty');
    }

    el.appendChild(slot);
  }

  return {
    el,
    visibleIds,
    startMotion: (durationMs) => {
      for (const img of imgs) startKenBurns(img, durationMs);
    },
  };
}
