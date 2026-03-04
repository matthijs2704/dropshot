// Shared helpers for screen overlay modules.

/**
 * Filter an array of ticker messages, keeping only non-empty/non-whitespace strings.
 * Safely handles non-array input by returning an empty array.
 *
 * @param {*} messages - cfg.tickerMessages (may be undefined/null/non-array)
 * @returns {string[]}
 */
export function filterTickerMessages(messages) {
  return Array.isArray(messages) ? messages.filter(m => m && m.trim()) : [];
}

/**
 * Build an inline style string that positions an overlay element in one of
 * the four screen corners, honouring safe-area insets and a set of CSS custom
 * properties for per-element nudging.
 *
 * @param {string} corner          - 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
 * @param {object} safeInsets      - { top?: number, bottom?: number }
 * @param {string} cssVarPrefix    - CSS custom property prefix, e.g. '--bug-offset' or '--qr-bug-offset'
 * @param {string} [defaultCorner] - Fallback corner when `corner` is unrecognised (default: 'top-right')
 * @returns {string}
 */
export function cornerStyle(corner, safeInsets = {}, cssVarPrefix, defaultCorner = 'top-right') {
  const top    = 12 + (safeInsets.top    || 0);
  const bottom = 12 + (safeInsets.bottom || 0);
  const p      = cssVarPrefix;
  switch (corner) {
    case 'top-left':     return `top: calc(${top}px + var(${p}-top, 0px)); left: calc(14px + var(${p}-left, 0px));`;
    case 'top-right':    return `top: calc(${top}px + var(${p}-top, 0px)); right: calc(14px + var(${p}-right, 0px));`;
    case 'bottom-left':  return `bottom: calc(${bottom}px + var(${p}-bottom, 0px)); left: calc(14px + var(${p}-left, 0px));`;
    case 'bottom-right': return `bottom: calc(${bottom}px + var(${p}-bottom, 0px)); right: calc(14px + var(${p}-right, 0px));`;
    default:             return cornerStyle(defaultCorner, safeInsets, cssVarPrefix);
  }
}

/**
 * Map a tickerAlign value to the CSS padding string used on the inner
 * element in fade mode.
 *
 * @param {string} align - 'start' | 'center' | 'end'
 * @returns {string}
 */
export function tickerFadePadding(align) {
  if (align === 'center') return '0 32px';
  if (align === 'end')    return '0 16px 0 0';
  return '0 0 0 16px'; // start
}

/**
 * Start a continuously-scrolling ticker animation.
 * The inner element is translated left at `speed` px/s, wrapping when the
 * full scrollWidth has scrolled past.
 *
 * @param {HTMLElement} inner
 * @param {number}      speed  - pixels per second
 * @returns {() => void}  stop function — cancels the animation frame
 */
export function startTickerScroll(inner, speed) {
  let pos      = 0;
  let lastTime = null;
  let frame    = null;

  function step(ts) {
    if (lastTime !== null) {
      const dt = (ts - lastTime) / 1000;
      pos += speed * dt;
      if (pos > inner.scrollWidth) pos = -window.innerWidth;
      inner.style.transform = `translateX(${-pos}px)`;
    }
    lastTime = ts;
    frame    = requestAnimationFrame(step);
  }

  frame = requestAnimationFrame(step);
  return () => { if (frame) { cancelAnimationFrame(frame); frame = null; } };
}

/**
 * Start a fade-cycling ticker animation (fade out → swap → fade in → dwell → repeat).
 *
 * @param {HTMLElement} inner
 * @param {string[]}    messages
 * @param {number}      dwellMs
 * @param {string}      align    - 'start' | 'center' | 'end'
 * @returns {() => void}  stop function — cancels any pending timer
 */
export function startTickerFade(inner, messages, dwellMs, align) {
  const padding = tickerFadePadding(align);
  let msgIndex  = 1;
  let timer     = null;

  function showNext() {
    if (!inner || !messages.length) return;
    inner.style.opacity = '0';
    setTimeout(() => {
      if (!inner) return;
      inner.textContent  = messages[msgIndex % messages.length];
      inner.style.transform = 'none';
      inner.style.padding   = padding;
      inner.style.opacity = '1';
      msgIndex++;
      timer = setTimeout(showNext, dwellMs);
    }, 500);
  }

  inner.style.padding   = padding;
  inner.style.transform = 'none';
  inner.style.opacity   = '1';
  inner.textContent = messages[0] || '';

  if (messages.length > 1) {
    timer = setTimeout(showNext, dwellMs);
  }

  return () => { if (timer) { clearTimeout(timer); timer = null; } };
}
