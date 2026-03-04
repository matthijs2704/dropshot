// Slide renderer: webpage (sandboxed iframe)

import { el, slideDurationMs, slideDelay } from '../../shared/utils.js';

/**
 * @param {object} slide
 * @returns {{ el: HTMLElement, play: () => Promise<void> }}
 */
export function buildWebpageSlide(slide) {
  const iframe = el('iframe', { attrs: {
    sandbox: 'allow-scripts allow-same-origin allow-forms',
    src:     slide.src || 'about:blank',
  }});

  const wrap = el('div', { cls: 'slide-webpage' }, iframe);

  const durationMs = slideDurationMs(slide, 15);

  return { el: wrap, play: () => slideDelay(durationMs) };
}
