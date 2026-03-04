// Overlay: corner QR widget (small persistent QR code)
// Uses the same server-generated QR PNG as the QR slide type.
// Appearance is driven by CSS custom properties; all have fallbacks matching the
// original hardcoded defaults so the widget looks identical when no theme is active.

import { cornerStyle } from './_overlay-utils.js';

let _qrBugEl  = null;
let _lastUrl  = null;

export async function mountQrBug(cfg, safeInsets = {}) {
  if (!cfg.qrBugEnabled || !cfg.qrBugUrl) {
    removeQrBug();
    return;
  }

  // Only re-fetch and re-mount if the URL changed; avoids a visible flicker
  // when an unrelated config_update arrives while the QR bug is already shown.
  if (_qrBugEl && _lastUrl === cfg.qrBugUrl) {
    // Still update position/label in-place
    _qrBugEl.setAttribute('style', cornerStyle(cfg.qrBugCorner, safeInsets, '--qr-bug-offset', 'bottom-right'));
    return;
  }

  removeQrBug();

  let imgSrc = '';
  try {
    const res  = await fetch(`/api/slides/qr?url=${encodeURIComponent(cfg.qrBugUrl)}`);
    if (!res.ok) return;
    const data = await res.json();
    imgSrc = data.url || '';
  } catch { return; }

  if (!imgSrc) return;

  const el = document.createElement('div');
  el.id = 'overlay-qr-bug';
  el.setAttribute('style', cornerStyle(cfg.qrBugCorner, safeInsets, '--qr-bug-offset', 'bottom-right'));

  const img = document.createElement('img');
  img.src = imgSrc;
  el.appendChild(img);

  if (cfg.qrBugLabel) {
    const label = document.createElement('div');
    label.className = 'qr-bug-label';
    label.textContent = cfg.qrBugLabel;
    el.appendChild(label);
  }

  document.body.appendChild(el);
  _qrBugEl = el;
  _lastUrl  = cfg.qrBugUrl;
}

export function removeQrBug() {
  if (_qrBugEl) { _qrBugEl.remove(); _qrBugEl = null; }
  _lastUrl = null;
}
