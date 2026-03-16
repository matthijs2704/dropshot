/**
 * Slide renderer: QR code
 *
 * Layout (top → bottom, centred):
 *   [optional title]
 *   [accent divider]
 *   [QR code image]
 *   [URL caption in monospace]
 *   [optional sub-caption]
 *
 * All colours/fonts honour CSS custom property overrides (theme system).
 */

import { el, slideDurationMs, slideDelay } from '../../shared/utils.js';

/**
 * @param {object} slide
 * @returns {{ el: HTMLElement, play: () => Promise<void> }}
 */
export async function buildQrSlide(slide) {

  // ── Root ──────────────────────────────────────────────────────────────────
  const wrap = el('div', { cls: 'slide-qr' });

  // Subtle vignette so pure-white slides don't glare on dark screens
  wrap.appendChild(el('div', { cls: 'qr-vignette' }));

  // ── Inner content stack ───────────────────────────────────────────────────
  const stack = el('div', { cls: 'qr-stack' });

  // Title (optional)
  if (slide.title) {
    stack.appendChild(el('div', { cls: 'qr-title', text: slide.title }));
    stack.appendChild(el('div', { cls: 'qr-rule' }));
  }

  // ── QR image ──────────────────────────────────────────────────────────────
  let imgSrc = '';
  try {
    const res  = await fetch(`/api/slides/qr?url=${encodeURIComponent(slide.url || '')}`);
    const data = await res.json();
    imgSrc = data.url || '';
  } catch { /* leave blank */ }

  if (imgSrc) {
    // White card behind the QR so it scans correctly even on coloured backgrounds
    stack.appendChild(el('div', { cls: 'qr-card' },
      el('img', { src: imgSrc, alt: 'QR Code' }),
    ));
  }

  if (slide.url)     stack.appendChild(el('div', { cls: 'qr-url',     text: slide.url }));
  if (slide.caption) stack.appendChild(el('div', { cls: 'qr-caption', text: slide.caption }));

  wrap.appendChild(stack);

  const durationMs = slideDurationMs(slide, 10);

  return {
    el:   wrap,
    play: (signal) => slideDelay(durationMs, signal),
  };
}
