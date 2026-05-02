// Sends screen_heartbeat messages to the server at a fixed interval.

import { sendHeartbeat } from './ws-send.js';

const HEARTBEAT_INTERVAL_MS = 1800;

let _screenId  = null;
let _getState  = null; // function returning { layoutType, focusGroup, visibleIds, lastCycleAt, lastCycleDurationMs }
let _interval  = null;
let _swVersion = null;

/**
 * Start sending heartbeats.
 *
 * @param {string} screenId
 * @param {Function} getState - callback returning current display state
 */
export function startHeartbeat(screenId, getState) {
  _screenId = screenId;
  _getState = getState;

  // Fetch the SW version once; it stays constant until the SW updates
  fetch('/sw-version')
    .then(r => r.ok ? r.json() : null)
    .then(d => { _swVersion = d?.version ?? null; })
    .catch(() => {});

  if (_interval) clearInterval(_interval);
  _interval = setInterval(_tick, HEARTBEAT_INTERVAL_MS);
}

export function stopHeartbeat() {
  if (_interval) clearInterval(_interval);
  _interval = null;
}

function _tick() {
  const state = _getState ? _getState() : {};
  sendHeartbeat({ ...state, swVersion: _swVersion });
}
