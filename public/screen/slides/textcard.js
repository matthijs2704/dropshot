/**
 * Slide renderer: text-card
 *
 * Four visual presets. All colour/font values are expressed as CSS custom
 * property references with hardcoded fallbacks so themes can override them
 * without touching this file.
 *
 * Presets:
 *   dark-center   — dark background, centred, accent top bar
 *   light-left    — light background, left-aligned, vertical accent bar
 *   gradient      — deep gradient background, centred, no accent bar
 *   minimal       — near-black, left-aligned, subtle accent dot
 */

import { el, slideDurationMs, slideDelay } from '../../shared/utils.js';

const PRESET_CLASS = {
  'dark-center': 'tc-dark-center',
  'light-left':  'tc-light-left',
  gradient:      'tc-gradient',
  minimal:       'tc-minimal',
};

const PRESET_ACCENT_BAR = {
  'dark-center': 'top',
  'light-left':  'left',
  gradient:      'top',
  minimal:       'none',
};

/**
 * @param {object} slide
 * @returns {{ el: HTMLElement, play: () => Promise<void> }}
 */
export function buildTextCardSlide(slide) {
  const templateKey  = slide.template || 'dark-center';
  const presetClass  = PRESET_CLASS[templateKey]  || PRESET_CLASS['dark-center'];
  const accentBar    = PRESET_ACCENT_BAR[templateKey] ?? 'top';

  // ── Root wrapper ──────────────────────────────────────────────────────────
  const wrap = el('div', { cls: `slide-textcard ${presetClass}` });
  if (slide.bgColor) wrap.style.background = slide.bgColor;

  // ── Accent bar (top or left) ───────────────────────────────────────────────
  if (accentBar === 'top')  wrap.appendChild(el('div', { cls: 'tc-accent-top' }));
  if (accentBar === 'left') wrap.appendChild(el('div', { cls: 'tc-accent-left' }));

  // ── Content block ─────────────────────────────────────────────────────────
  const inner = el('div', { cls: 'tc-inner' });

  // Minimal preset: small accent dot above title
  if (accentBar === 'none' && slide.title) inner.appendChild(el('div', { cls: 'tc-dot' }));

  if (slide.title)             inner.appendChild(el('div', { cls: 'tc-title', text: slide.title }));
  if (slide.title && slide.body) inner.appendChild(el('div', { cls: 'tc-rule' }));
  if (slide.body)              inner.appendChild(el('div', { cls: 'tc-body',  text: slide.body }));

  wrap.appendChild(inner);

  const durationMs = slideDurationMs(slide, 10);

  return {
    el:   wrap,
    play: () => slideDelay(durationMs),
  };
}
