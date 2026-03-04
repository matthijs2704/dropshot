import { el } from '../../shared/utils.js';

// Polaroid layout: photos displayed as slightly rotated "polaroid" cards
// on a dark background. Cards are scattered across the whole screen including
// the centre, overlapping naturally like photos tossed on a table.

function jitter(base, range) {
  return base + (Math.random() - 0.5) * 2 * range;
}

/**
 * @param {Object[]} photos - 5–10 photos
 * @returns {{ el, visibleIds, startMotion }}
 */
export function buildPolaroid(photos) {
  const rootEl = el('div', { cls: 'layout layout-polaroid' });

  // Warm vignette
  rootEl.appendChild(el('div', { cls: 'polaroid-vignette' }));

  // Position presets — centres spread across the whole screen, including middle.
  // cx/cy are % of screen width/height for the card centre.
  // Designed so no large empty region forms regardless of jitter.
  const PRESETS = {
    5: [
      { cx: 25, cy: 35, rot: -7 },
      { cx: 72, cy: 28, rot:  6 },
      { cx: 50, cy: 55, rot: -3 }, // centre
      { cx: 22, cy: 72, rot:  8 },
      { cx: 76, cy: 68, rot: -6 },
    ],
    6: [
      { cx: 22, cy: 32, rot: -8 },
      { cx: 58, cy: 25, rot:  5 },
      { cx: 82, cy: 45, rot: -4 },
      { cx: 42, cy: 55, rot:  7 }, // centre-left
      { cx: 20, cy: 70, rot: -5 },
      { cx: 68, cy: 72, rot:  6 },
    ],
    7: [
      { cx: 20, cy: 30, rot: -8 },
      { cx: 52, cy: 22, rot:  4 },
      { cx: 80, cy: 35, rot: -5 },
      { cx: 35, cy: 52, rot:  7 }, // centre-left
      { cx: 68, cy: 56, rot: -6 }, // centre-right
      { cx: 22, cy: 74, rot:  5 },
      { cx: 72, cy: 75, rot: -7 },
    ],
    8: [
      { cx: 18, cy: 28, rot: -8 },
      { cx: 48, cy: 20, rot:  4 },
      { cx: 78, cy: 30, rot: -3 },
      { cx: 28, cy: 52, rot:  6 },
      { cx: 62, cy: 48, rot: -7 }, // centre-right
      { cx: 82, cy: 66, rot:  5 },
      { cx: 48, cy: 72, rot: -4 }, // centre-bottom
      { cx: 16, cy: 68, rot:  7 },
    ],
    9: [
      { cx: 16, cy: 26, rot: -8 },
      { cx: 44, cy: 18, rot:  5 },
      { cx: 74, cy: 24, rot: -3 },
      { cx: 86, cy: 50, rot:  8 },
      { cx: 26, cy: 46, rot: -6 },
      { cx: 55, cy: 50, rot:  3 }, // centre
      { cx: 74, cy: 72, rot: -7 },
      { cx: 42, cy: 76, rot:  6 },
      { cx: 16, cy: 68, rot: -4 },
    ],
    10: [
      { cx: 15, cy: 24, rot: -8 },
      { cx: 40, cy: 16, rot:  5 },
      { cx: 66, cy: 20, rot: -2 },
      { cx: 86, cy: 36, rot:  8 },
      { cx: 28, cy: 44, rot: -6 },
      { cx: 56, cy: 40, rot:  4 }, // centre
      { cx: 82, cy: 62, rot: -5 },
      { cx: 58, cy: 72, rot:  6 },
      { cx: 32, cy: 74, rot: -6 },
      { cx: 12, cy: 60, rot:  7 },
    ],
  };

  const count      = Math.min(Math.max(photos.length, 5), 10);
  const bases      = PRESETS[count] || PRESETS[5];
  const visibleIds = [];

  // Card sizing — large but scales down gently for higher counts.
  // Overlap is intentional; each card is fully visible before the next lands.
  const PHOTO_VH  = count <= 5 ? 48 : count <= 6 ? 44 : count <= 7 ? 40 : count <= 8 ? 37 : count <= 9 ? 34 : 31;
  const BORDER_VH = Math.max(1.2, PHOTO_VH * 0.05); // ~5% border, minimum 1.2vh
  const FOOTER_VH = BORDER_VH * 4.0;                // thick bottom strip (4× side border)
  const CARD_W_VH = PHOTO_VH + BORDER_VH * 2;
  const CARD_H_VH = PHOTO_VH + BORDER_VH + FOOTER_VH;

  const STAGGER_MS = 350;

  for (let i = 0; i < count; i++) {
    const photo = photos[i];
    const base  = bases[i];
    if (!photo) continue;

    const cx   = jitter(base.cx,  5);
    const cy   = jitter(base.cy,  4);
    const rot  = jitter(base.rot, 3.5);
    const rock = (i % 2 === 0 ? 0.5 : -0.5) + jitter(0, 0.3);
    const lift = Math.round(40 + Math.random() * 20) + 'px';
    const dur  = Math.round(380 + Math.random() * 80);

    const card = el('div', { cls: 'polaroid-card' });
    card.style.cssText = [
      `width:${CARD_W_VH}vh;`,
      `height:${CARD_H_VH}vh;`,
      `left:${cx}%;top:${cy}%;`,
      `transform:translate(-50%,-50%) rotate(${rot}deg);`,
      `--rot:${rot}deg;`,
      `--rock:${rock}deg;`,
      `--lift:${lift};`,
      `z-index:${i + 1};`,
      `animation:polaroid-drop ${dur}ms cubic-bezier(0.25,0.46,0.45,0.94) ${i * STAGGER_MS}ms both;`,
    ].join('');

    // Photo — forced square via aspect-ratio so landscape/portrait both crop correctly
    const photoWrap = el('div', { cls: 'polaroid-photo-wrap' });
    photoWrap.style.cssText = [
      `width:${PHOTO_VH}vh;`,
      `height:${PHOTO_VH}vh;`,
      `margin:${BORDER_VH}vh ${BORDER_VH}vh 0 ${BORDER_VH}vh;`,
    ].join('');

    const img = el('img', { src: photo.thumbUrl || photo.displayUrl || photo.url, alt: photo.name || '' });
    photoWrap.appendChild(img);

    // Thick white bottom strip — the polaroid signature
    const footer = el('div', { cls: 'polaroid-footer' });
    footer.style.height = `${FOOTER_VH}vh`;

    card.appendChild(photoWrap);
    card.appendChild(footer);
    rootEl.appendChild(card);

    visibleIds.push(photo.id);
  }

  return {
    el: rootEl,
    visibleIds,
    startMotion: () => {},
  };
}
