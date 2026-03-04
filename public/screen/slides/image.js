// Slide renderer: image
// Shows a static image fullscreen with configurable fit mode and optional
// Ken Burns motion. Duration is controlled by durationSec.

/**
 * @param {object} slide
 *   slide.filename  - filename inside slide-assets/images/
 *   slide.fit       - 'contain' | 'cover' | 'kenburns'  (default: 'contain')
 *   slide.durationSec - how long to show (default: 10)
 * @returns {{ el: HTMLElement, play: () => Promise<void> }}
 */
export function buildImageSlide(slide) {
  const fit        = slide.fit || 'contain';
  const durationMs = (slide.durationSec || 10) * 1000;
  const src        = `/slide-assets/images/${encodeURIComponent(slide.filename || '')}`;

  const wrap = document.createElement('div');
  wrap.className = 'slide-image';

  const img = document.createElement('img');
  img.src = src;
  img.alt = slide.label || '';

  if (fit === 'kenburns') {
    img.className = 'si-kenburns';
    img.style.setProperty('--kb-dur', `${durationMs}ms`);
  } else {
    img.className = fit === 'cover' ? 'si-cover' : 'si-contain';
  }

  wrap.appendChild(img);

  function play() {
    return new Promise(resolve => {
      // If the image fails to load, still advance after duration
      img.addEventListener('error', () => setTimeout(resolve, 1000), { once: true });
      setTimeout(resolve, durationMs);
    });
  }

  return { el: wrap, play };
}
