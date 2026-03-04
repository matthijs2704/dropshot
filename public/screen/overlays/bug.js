// Overlay: corner bug (text or image)
// Appearance is driven by CSS custom properties; all have fallbacks matching the
// original hardcoded defaults so the bug looks identical when no theme is active.

import { cornerStyle } from './_overlay-utils.js';

let _bugEl = null;

export function mountBug(cfg, safeInsets = {}) {
  removeBug();
  if (!cfg.bugEnabled) return;
  if (!cfg.bugText && !cfg.bugImageUrl) return;

  const el = document.createElement('div');
  el.id = 'overlay-bug';
  el.setAttribute('style', cornerStyle(cfg.bugCorner, safeInsets, '--bug-offset'));

  if (cfg.bugImageUrl) {
    const img = document.createElement('img');
    img.src = cfg.bugImageUrl;
    el.appendChild(img);
  }

  if (cfg.bugText) {
    const span = document.createElement('span');
    span.textContent = cfg.bugText;
    el.appendChild(span);
  }

  document.body.appendChild(el);
  _bugEl = el;
}

export function removeBug() {
  if (_bugEl) { _bugEl.remove(); _bugEl = null; }
}
