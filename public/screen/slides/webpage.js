// Slide renderer: webpage (sandboxed iframe)

/**
 * @param {object} slide
 * @returns {{ el: HTMLElement, play: () => Promise<void> }}
 */
export function buildWebpageSlide(slide) {
  const wrap = document.createElement('div');
  wrap.className = 'slide-webpage';

  const iframe = document.createElement('iframe');
  iframe.sandbox = 'allow-scripts allow-same-origin allow-forms';
  iframe.src     = slide.src || 'about:blank';

  wrap.appendChild(iframe);

  const durationMs = (slide.durationSec || 15) * 1000;

  function play() {
    return new Promise(resolve => setTimeout(resolve, durationMs));
  }

  return { el: wrap, play };
}
