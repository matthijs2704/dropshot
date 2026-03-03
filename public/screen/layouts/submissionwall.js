// Social wall layout — polaroid-card style.
// Cards have a fixed intrinsic size and are centred on the background;
// they never stretch to fill a cell. Pages crossfade when there are more
// submissions than fit on one screen.

let _styleInjected = false;

function _ensureStyle() {
  if (_styleInjected) return;
  _styleInjected = true;

  const style = document.createElement('style');
  style.id = 'submission-wall-layout-style';
  style.textContent = `
    .sw-layout {
      position: absolute;
      inset: 0;
      padding-top:    var(--screen-padding-top,    var(--screen-padding, 0px));
      padding-right:  var(--screen-padding-right,  var(--screen-padding, 0px));
      padding-bottom: var(--screen-padding-bottom, var(--screen-padding, 0px));
      padding-left:   var(--screen-padding-left,   var(--screen-padding, 0px));
      background:
        radial-gradient(110% 80% at 50% 0%, rgba(255, 255, 255, 0.08), transparent 60%),
        linear-gradient(165deg, rgba(0,0,0,0.18), rgba(0,0,0,0.05) 46%, transparent 72%),
        var(--submission-wall-bg, var(--polaroid-bg, #1b130c));
      overflow: hidden;
      isolation: isolate;
    }

    .sw-layout::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 25% 18%, rgba(255,255,255,0.05) 0%, transparent 36%),
        radial-gradient(circle at 80% 84%, rgba(255,255,255,0.04) 0%, transparent 38%),
        radial-gradient(ellipse at 50% 50%, transparent 44%, rgba(0, 0, 0, 0.48) 100%);
      z-index: 0;
    }

    /* ── Page ────────────────────────────────────────────────────────────── */

    .sw-page {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--sw-gap);
      padding: var(--sw-pad);
      z-index: 1;
    }

    .sw-page.sw-page-enter {
      animation: sw-page-in 600ms cubic-bezier(0.22, 0.9, 0.28, 1) both;
    }

    .sw-page.sw-page-exit {
      animation: sw-page-out 380ms cubic-bezier(0.4, 0, 1, 0.8) both;
    }

    @keyframes sw-page-in {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }

    @keyframes sw-page-out {
      from { opacity: 1; transform: translateY(0)      scale(1); }
      to   { opacity: 0; transform: translateY(-18px)  scale(0.97); }
    }

    /* ── Row ─────────────────────────────────────────────────────────────── */

    .sw-row {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      justify-content: center;
      gap: var(--sw-gap);
    }

    /* ── Card ────────────────────────────────────────────────────────────── */

    /* Cards are sized by CSS custom properties set inline by JS */
    .sw-card {
      flex: none;              /* never stretch */
      width:  var(--sw-card-w);
      background: var(--polaroid-card-bg, #fffef8);
      border-radius: var(--polaroid-card-radius, 8px);
      box-shadow: var(--polaroid-card-shadow,
        0 18px 44px rgba(0,0,0,0.55),
        0 5px 14px rgba(0,0,0,0.32));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: rotate(var(--sw-rot, 0deg));
      animation: sw-card-in var(--sw-card-dur, 480ms) cubic-bezier(0.22, 0.9, 0.28, 1) var(--sw-delay, 0ms) both;
    }

    @keyframes sw-card-in {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.93) rotate(var(--sw-rot, 0deg));
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1) rotate(var(--sw-rot, 0deg));
      }
    }

    /* ── Photo area ──────────────────────────────────────────────────────── */

    .sw-photo-wrap {
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 4px;
      /* margin set inline: border on all sides except bottom */
    }

    .sw-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }

    /* ── Bottom strip (polaroid footer) ─────────────────────────────────── */

    .sw-footer {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      /* padding / min-height set inline */
    }

    /* ── Message (text-only: fills the footer) ───────────────────────────── */

    .sw-message {
      color: var(--submission-wall-message-color, #2e2317);
      font-family: var(--submission-wall-message-font,
        var(--submission-font-family, 'Georgia', 'Times New Roman', serif));
      font-weight: 700;
      line-height: 1.22;
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: var(--sw-lines, 3);
      /* font-size set inline */
    }

    .sw-meta {
      color: var(--submission-wall-meta-color, #5e4d3a);
      font-family: var(--submission-wall-meta-font, 'Segoe UI', system-ui, sans-serif);
      font-weight: 600;
      letter-spacing: 0.02em;
      opacity: 0.82;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 3px;
      /* font-size set inline */
    }

    /* ── Quote mark ──────────────────────────────────────────────────────── */

    .sw-quote-mark {
      display: block;
      color: var(--submission-wall-message-color, #2e2317);
      font-family: var(--submission-wall-message-font, Georgia, serif);
      line-height: 0.7;
      opacity: 0.15;
      user-select: none;
      /* font-size set inline */
    }

    /* ── Empty state ─────────────────────────────────────────────────────── */

    .sw-empty {
      width: min(62vw, 920px);
      padding: clamp(18px, 2.2vw, 34px);
      border-radius: 14px;
      background: var(--polaroid-card-bg, #fffef8);
      box-shadow: var(--polaroid-card-shadow,
        0 20px 48px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.3));
      text-align: center;
      animation: sw-card-in 540ms cubic-bezier(0.22, 0.9, 0.28, 1) both;
    }

    .sw-empty-title {
      color: var(--submission-wall-message-color, #2e2317);
      font-family: var(--submission-wall-message-font,
        var(--submission-font-family, 'Georgia', 'Times New Roman', serif));
      font-size: clamp(34px, 4.2vw, 68px);
      line-height: 1.06;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .sw-empty-sub {
      color: var(--submission-wall-meta-color, #5e4d3a);
      font-family: var(--submission-wall-meta-font, 'Segoe UI', system-ui, sans-serif);
      font-size: clamp(16px, 1.7vw, 26px);
      font-weight: 600;
      line-height: 1.25;
    }

    /* ── QR bug ──────────────────────────────────────────────────────────── */

    .sw-qr {
      position: absolute;
      right: clamp(12px, 1.8vw, 24px);
      bottom: clamp(12px, 1.8vh, 24px);
      z-index: 3;
      background: rgba(8, 12, 18, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 12px;
      padding: 9px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      box-shadow: 0 8px 18px rgba(0,0,0,0.36);
      animation: sw-card-in 420ms cubic-bezier(0.22, 0.9, 0.28, 1) 160ms both;
    }

    .sw-qr img {
      width: min(10.5vw, 112px);
      border-radius: 5px;
      background: #fff;
    }

    .sw-qr-label {
      color: #fff;
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: clamp(10px, 0.92vw, 13px);
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      opacity: 0.93;
    }
  `;

  document.head.appendChild(style);
}

/* ── Sizing maths ─────────────────────────────────────────────────────── */

// PAGE_SIZE caps how many cards go on one page.
const PAGE_SIZE     = 6;
const PAGE_DWELL_MS = 6000;
const PAGE_EXIT_MS  = 380;

/**
 * Compute card dimensions based on how many cards appear on the page.
 *
 * Returns pixel values derived from the viewport so cards always fit
 * without scrolling but retain natural polaroid proportions.
 *
 * Layout is always arranged as rows of at most 3 cards:
 *   1 → [1]   (hero, single centred card — wider)
 *   2 → [2]
 *   3 → [3]
 *   4 → [2,2]
 *   5 → [3,2]
 *   6 → [3,3]
 */
function _sizing(n, bottomInset) {
  const vw = window.innerWidth  || 1920;
  const vh = window.innerHeight || 1080;
  const usableH = vh - (bottomInset || 0);

  const cols = n === 1 ? 1 : n <= 3 ? n : 3;
  const rows = n === 1 ? 1 : n <= 3 ? 1 : Math.ceil(n / 3);

  // Gaps and padding in px
  const pad  = Math.round(Math.min(vw * 0.022, 32));
  const gap  = Math.round(Math.min(vw * 0.016, 22));

  // Available space
  const availW = vw - pad * 2 - gap * (cols - 1);
  const availH = usableH - pad * 2 - gap * (rows - 1);

  // Card width derived from horizontal space
  const cardW = Math.floor(availW / cols);

  // Photo square inside the card (polaroid style: equal-sided)
  // Border = 4% of card width, minimum 6px
  const border = Math.max(6, Math.round(cardW * 0.04));

  // Photo size: square, fills card width inside borders
  const photoSize = cardW - border * 2;

  // Footer height: a generous white strip below the photo
  // Hero gets a taller footer for bigger text; grid cards get a compact one
  const footerH = n === 1
    ? Math.round(cardW * 0.22)
    : Math.round(cardW * 0.28);

  // Total card height
  const cardH = border + photoSize + footerH; // no bottom border — footer is the bottom

  // Check that the grid actually fits vertically; scale down if needed
  const totalH = cardH * rows + gap * (rows - 1) + pad * 2;
  const scale  = totalH > usableH ? (usableH - pad * 2 - gap * (rows - 1)) / (cardH * rows) : 1;
  const finalCardW = Math.floor(cardW  * scale);
  const finalCardH = Math.floor(cardH  * scale);
  const finalBorder = Math.max(5, Math.round(border * scale));
  const finalPhoto = finalCardW - finalBorder * 2;
  const finalFooter = finalCardH - finalBorder - finalPhoto;

  // Font sizes relative to card width
  const msgSize  = n === 1
    ? Math.round(finalCardW * 0.055)   // hero: big
    : Math.round(finalCardW * 0.072);  // grid: fill the footer
  const metaSize = Math.round(msgSize * 0.62);
  const quoteSize = Math.round(msgSize * 1.8);

  return {
    cols, rows, pad, gap,
    cardW: finalCardW, cardH: finalCardH,
    border: finalBorder,
    photoSize: finalPhoto,
    footerH: finalFooter,
    msgSize, metaSize, quoteSize,
  };
}

/* ── Row layout helper ────────────────────────────────────────────────── */

/** Array of row lengths for n cards in a max-3 grid. */
function _rowSizes(n) {
  if (n <= 3) return [n];
  if (n === 4) return [2, 2];
  if (n === 5) return [3, 2];
  return [3, 3]; // 6
}

/* ── Card builder ─────────────────────────────────────────────────────── */

function _buildCard(item, sz, delayMs, isHero) {
  const hasPhoto   = !!(item.photoThumbUrl || item.photoUrl);
  const msgText    = String(item.message || '').trim();
  const metaText   = item.submitterValue ? `— ${item.submitterValue}` : '';

  const card = document.createElement('article');
  card.className = 'sw-card';
  card.style.setProperty('--sw-rot',    `${(Math.random() * 3.2 - 1.6).toFixed(2)}deg`);
  card.style.setProperty('--sw-delay',  `${delayMs}ms`);
  card.style.setProperty('--sw-card-w', `${sz.cardW}px`);
  if (isHero) card.style.setProperty('--sw-rot', `${(Math.random() * 1.4 - 0.7).toFixed(2)}deg`);

  if (hasPhoto) {
    // Photo area — square, with polaroid border on sides and top
    const wrap = document.createElement('div');
    wrap.className = 'sw-photo-wrap';
    wrap.style.cssText = [
      `width:${sz.photoSize}px;`,
      `height:${sz.photoSize}px;`,
      `margin:${sz.border}px ${sz.border}px 0 ${sz.border}px;`,
    ].join('');

    const img = document.createElement('img');
    img.className = 'sw-photo';
    img.src = item.photoThumbUrl || item.photoUrl;
    img.alt = '';
    wrap.appendChild(img);
    card.appendChild(wrap);
  }

  // Footer / copy area
  const footer = document.createElement('div');
  footer.className = 'sw-footer';
  footer.style.cssText = [
    `min-height:${sz.footerH}px;`,
    `padding:${Math.round(sz.footerH * 0.12)}px ${sz.border}px ${Math.round(sz.footerH * 0.14)}px;`,
  ].join('');

  if (!hasPhoto && msgText) {
    // Text-only card: decorative quote mark above message
    const qm = document.createElement('span');
    qm.className = 'sw-quote-mark';
    qm.textContent = '\u201C';
    qm.style.fontSize = `${sz.quoteSize}px`;
    footer.appendChild(qm);
  }

  if (msgText) {
    const msg = document.createElement('div');
    msg.className = 'sw-message';
    msg.textContent = msgText;
    msg.style.fontSize = `${sz.msgSize}px`;
    // Text-only: allow more lines in the tall footer
    msg.style.setProperty('--sw-lines', hasPhoto ? '2' : '5');
    footer.appendChild(msg);
  }

  if (metaText) {
    const meta = document.createElement('div');
    meta.className = 'sw-meta';
    meta.textContent = metaText;
    meta.style.fontSize = `${sz.metaSize}px`;
    footer.appendChild(meta);
  }

  card.appendChild(footer);
  return card;
}

/* ── Page builder ─────────────────────────────────────────────────────── */

function _buildPage(items, entering, bottomInset) {
  const n    = items.length;
  const sz   = _sizing(n, bottomInset);
  const rows = _rowSizes(n);

  const page = document.createElement('div');
  page.className = 'sw-page' + (entering ? ' sw-page-enter' : '');
  page.style.setProperty('--sw-gap', `${sz.gap}px`);
  page.style.setProperty('--sw-pad', `${sz.pad}px`);

  const isHero = n === 1;
  let cursor = 0;
  rows.forEach((rowLen, rowIdx) => {
    const row = document.createElement('div');
    row.className = 'sw-row';
    for (let i = 0; i < rowLen; i++) {
      const delay = (rowIdx * 3 + i) * 70;
      const card  = _buildCard(items[cursor++], sz, delay, isHero);
      row.appendChild(card);
    }
    page.appendChild(row);
  });

  return page;
}

/* ── QR bug ───────────────────────────────────────────────────────────── */

function _appendQr(shell, options = {}) {
  if (!options.showQr || !options.qrImageUrl) return;
  const bottomInset = Number(options.bottomInset) || 0;
  const baseBottom  = Math.max(12, Math.round(window.innerHeight * 0.018));

  const qr = document.createElement('div');
  qr.className = 'sw-qr';
  qr.style.bottom = `${baseBottom + bottomInset}px`;

  const img = document.createElement('img');
  img.src = options.qrImageUrl;
  img.alt = '';
  qr.appendChild(img);

  const label = document.createElement('div');
  label.className = 'sw-qr-label';
  label.textContent = 'submit yours';
  qr.appendChild(label);

  shell.appendChild(qr);
}

/* ── Page rotation ────────────────────────────────────────────────────── */

function _startPaging(shell, pageChunks, firstPage, bottomInset) {
  if (pageChunks.length <= 1) return () => {};

  let current   = firstPage;
  let pageIndex = 0;
  let timer     = null;

  function advance() {
    if (!shell.isConnected) return;

    pageIndex = (pageIndex + 1) % pageChunks.length;
    const next = _buildPage(pageChunks[pageIndex], false, bottomInset);

    current.classList.remove('sw-page-enter');
    current.classList.add('sw-page-exit');

    timer = setTimeout(() => {
      if (!shell.isConnected) return;
      current.remove();
      next.classList.add('sw-page-enter');
      const qrEl = shell.querySelector('.sw-qr');
      qrEl ? shell.insertBefore(next, qrEl) : shell.appendChild(next);
      current = next;
      timer = setTimeout(advance, PAGE_DWELL_MS);
    }, PAGE_EXIT_MS);
  }

  timer = setTimeout(advance, PAGE_DWELL_MS);
  return () => clearTimeout(timer);
}

/* ── Public API ───────────────────────────────────────────────────────── */

/**
 * @param {Array}  items
 * @param {string} mode   'single' | 'grid' | 'both'
 * @param {{ showQr?: boolean, qrImageUrl?: string, bottomInset?: number }} options
 */
export function buildSubmissionWall(items, mode = 'both', options = {}) {
  _ensureStyle();

  const list        = Array.isArray(items) ? items : [];
  const bottomInset = Number(options.bottomInset) || 0;

  const el = document.createElement('div');
  el.className = 'layout sw-layout';
  if (bottomInset > 0) el.style.paddingBottom = `${bottomInset}px`;

  const shell = document.createElement('div');
  shell.className = 'sw-shell';
  shell.style.cssText = 'position:relative;width:100%;height:100%;';
  el.appendChild(shell);

  // Empty state
  if (!list.length) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;';

    const empty = document.createElement('div');
    empty.className = 'sw-empty';

    const title = document.createElement('div');
    title.className = 'sw-empty-title';
    title.textContent = 'Share your photos';
    empty.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'sw-empty-sub';
    sub.textContent = 'Your approved submissions will appear here';
    empty.appendChild(sub);

    wrap.appendChild(empty);
    shell.appendChild(wrap);
    _appendQr(shell, options);
    return { el, visibleIds: [], startMotion: () => {} };
  }

  // Effective mode
  const effectiveMode = mode === 'both'
    ? (list.length === 1 ? 'single' : 'grid')
    : mode;

  // Single / hero
  if (effectiveMode === 'single' || list.length === 1) {
    const page = _buildPage([list[0]], true, bottomInset);
    shell.appendChild(page);
    _appendQr(shell, options);
    return {
      el,
      visibleIds: [`submission:${list[0].id}`],
      startMotion: () => {},
    };
  }

  // Grid with optional paging
  const pageChunks = [];
  for (let i = 0; i < list.length; i += PAGE_SIZE) {
    pageChunks.push(list.slice(i, i + PAGE_SIZE));
  }

  const firstPage = _buildPage(pageChunks[0], true, bottomInset);
  shell.appendChild(firstPage);
  _appendQr(shell, options);

  let _stopPaging = () => {};

  return {
    el,
    visibleIds: list.map(i => `submission:${i.id}`),
    startMotion() {
      _stopPaging = _startPaging(shell, pageChunks, firstPage, bottomInset);
    },
    destroy() {
      _stopPaging();
    },
  };
}
