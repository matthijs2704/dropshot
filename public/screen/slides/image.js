// Slide renderer: image
// Shows a static image fullscreen with configurable fit mode and optional
// Ken Burns motion. Duration is controlled by durationSec.

import { el, slideDurationMs } from '../../shared/utils.js';

/**
 * @param {object} slide
 *   slide.filename  - filename inside slide-assets/images/
 *   slide.fit       - 'contain' | 'cover' | 'kenburns'  (default: 'contain')
 *   slide.durationSec - how long to show (default: 10)
 * @returns {{ el: HTMLElement, play: () => Promise<void> }}
 */
export function buildImageSlide(slide) {
  const fit        = slide.fit || 'contain';
  const durationMs = slideDurationMs(slide, 10);
  const src        = `/slide-assets/images/${encodeURIComponent(slide.filename || '')}`;

  const imgCls = fit === 'kenburns' ? 'si-kenburns'
               : fit === 'cover'    ? 'si-cover'
               :                     'si-contain';

  const img = el('img', { src, alt: slide.label || '', cls: imgCls });
  if (fit === 'kenburns') img.style.setProperty('--kb-dur', `${durationMs}ms`);

  const wrap = el('div', { cls: 'slide-image' }, img);

  function play(signal) {
    return new Promise(resolve => {
      if (signal?.aborted) {
        resolve();
        return;
      }

      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(mainTimer);
        clearTimeout(errTimer);
        img.removeEventListener('error', onError);
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve();
      };

      const onAbort = () => finish();
      const onError = () => {
        clearTimeout(mainTimer);
        errTimer = setTimeout(finish, 1000);
      };

      let errTimer = null;
      const mainTimer = setTimeout(finish, durationMs);
      img.addEventListener('error', onError, { once: true });

      if (signal) signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  return { el: wrap, play };
}
