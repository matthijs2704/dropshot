'use strict';

// ---------------------------------------------------------------------------
// In-screen settings overlay
// Press F12 to open. Shows device/setup info, screen ID selector, SW version.
// Communicates with the local agent (127.0.0.1:3987) if running.
// ---------------------------------------------------------------------------

const AGENT_URL     = 'http://127.0.0.1:3987';
const AUTO_CLOSE_MS = 60_000;

let _screenId     = '1';
let _closeTimer   = null;
let _overlayEl    = null;

export function initSettings(screenId) {
  _screenId = String(screenId || '1');

  _overlayEl = document.getElementById('settings-overlay');
  if (!_overlayEl) return;

  document.addEventListener('keydown', e => {
    if (e.key === 'F12') {
      e.preventDefault();
      _isOpen() ? _close() : _open();
    }
    if (e.key === 'Escape' && _isOpen()) _close();
  });
}

// ---------------------------------------------------------------------------
// Open / close
// ---------------------------------------------------------------------------

function _isOpen() {
  return _overlayEl && !_overlayEl.classList.contains('settings-hidden');
}

function _close() {
  clearTimeout(_closeTimer);
  _overlayEl.classList.add('settings-hidden');
}

async function _open() {
  clearTimeout(_closeTimer);
  _overlayEl.classList.remove('settings-hidden');
  _overlayEl.innerHTML = '<div class="settings-card"><p class="settings-loading">Laden…</p></div>';

  const [info, agent, swVersion] = await Promise.all([
    _fetchInfo(),
    _fetchAgent(),
    _fetchSwVersion(),
  ]);

  _render(info, agent, swVersion);
  _closeTimer = setTimeout(_close, AUTO_CLOSE_MS);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function _render(info, agent, swVersion) {
  const deviceIps = agent?.lanIps?.length
    ? agent.lanIps
    : [];
  const deviceSetupUrl = deviceIps.length
    ? `http://${deviceIps[0]}:3987`
    : AGENT_URL;
  const backendUrl = agent?.config?.serverUrl || location.origin;
  const pairingCode = agent?.agent?.pairingCode || '';

  const screenButtons = [1, 2, 3, 4].map(n => {
    const active = String(n) === _screenId;
    return `<button class="settings-screen-btn${active ? ' active' : ''}" data-screen="${n}">${n}</button>`;
  }).join('');

  const agentSection = agent
    ? `<a class="settings-link" href="${_esc(deviceSetupUrl)}" target="_blank">Setup opnieuw (agent)</a>`
    : '';

  _overlayEl.innerHTML = `
    <div class="settings-card" id="settings-card-inner">
      <button class="settings-close" id="settings-close-btn" aria-label="Sluiten">✕</button>

      <div class="settings-section">
        <div class="settings-label">Device</div>
        <div class="settings-value settings-mono">${_esc(agent ? deviceSetupUrl : 'Geen lokale agent')}</div>
      </div>

      ${deviceIps.length ? `<div class="settings-section">
        <div class="settings-label">Device IP's</div>
        <div class="settings-value settings-mono">${_esc(deviceIps.join('  ·  '))}</div>
      </div>` : ''}

      <div class="settings-section">
        <div class="settings-label">Backend</div>
        <div class="settings-value settings-mono">${_esc(backendUrl)}</div>
      </div>

      <div class="settings-section">
        <div class="settings-label">SW versie</div>
        <div class="settings-value settings-mono">${swVersion != null ? `v${_esc(String(swVersion))}` : '–'}</div>
      </div>

      ${pairingCode ? `<div class="settings-section">
        <div class="settings-label">Koppelcode</div>
        <div class="settings-value settings-mono" style="font-size:1.2em;letter-spacing:.1em">${_esc(pairingCode)}</div>
      </div>` : ''}

      <div class="settings-section">
        <div class="settings-label">Scherm ID</div>
        <div class="settings-screen-btns">${screenButtons}</div>
      </div>

      <div class="settings-footer">
        ${agentSection}
        <span class="settings-muted">Sluit: Escape of F12 · Auto-sluit na 60 s</span>
      </div>
    </div>
  `;

  document.getElementById('settings-close-btn')?.addEventListener('click', _close);

  _overlayEl.querySelectorAll('.settings-screen-btn').forEach(btn => {
    btn.addEventListener('click', () => _switchScreen(btn.dataset.screen));
  });

  _overlayEl.addEventListener('click', e => {
    if (e.target === _overlayEl) _close();
  });
}

// ---------------------------------------------------------------------------
// Screen ID switch
// ---------------------------------------------------------------------------

async function _switchScreen(newId) {
  if (String(newId) === _screenId) return;

  // Try to persist via agent first
  const ag = await _fetchAgent();
  if (ag?.config) {
    try {
      await fetch(`${AGENT_URL}/api/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ag.config, screenId: String(newId) }),
      });
    } catch {
      // agent unreachable — just navigate
    }
  }

  const url = new URL(location.href);
  url.searchParams.set('screen', newId);
  location.href = url.toString();
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

async function _fetchInfo() {
  try {
    const r = await fetch('/api/screens/info');
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

async function _fetchAgent() {
  try {
    const r = await fetch(`${AGENT_URL}/api/status`, { signal: AbortSignal.timeout(1500) });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

async function _fetchSwVersion() {
  try {
    const r = await fetch('/sw-version');
    return r.ok ? (await r.json()).version : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
