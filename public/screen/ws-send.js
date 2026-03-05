// Centralized WebSocket send layer.
//
// Holds a single WebSocket reference and provides named send functions
// for every outgoing message type.  All sends include a readyState guard
// and try/catch so callers never need to worry about closed-socket throws.

/** @type {WebSocket|null} */
let _ws = null;

/** @type {string|null} */
let _screenId = null;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Set the active WebSocket and screen identity.
 * Called once on each successful connection.
 */
export function setWs(ws, screenId) {
  _ws = ws;
  _screenId = screenId;
}

/**
 * Clear the WebSocket reference.
 * Called on close so stale sends are silently dropped.
 */
export function clearWs() {
  _ws = null;
}

// ---------------------------------------------------------------------------
// Internal send helper
// ---------------------------------------------------------------------------

/**
 * Send a JSON message on the current WebSocket.
 * Returns true if the message was sent, false if dropped.
 *
 * @param {string} type
 * @param {Object} [payload]
 * @returns {boolean}
 */
function _send(type, payload = {}) {
  if (!_ws || _ws.readyState !== 1) return false;
  try {
    _ws.send(JSON.stringify({ type, ...payload }));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Outgoing message types
// ---------------------------------------------------------------------------

/** Request a photo sync from the server. */
export function sendSyncPhotos(knownIds) {
  return _send('sync_photos', { knownIds });
}

/** Periodic heartbeat with display state. */
export function sendHeartbeat(state) {
  return _send('screen_heartbeat', {
    screenId:            _screenId,
    layoutType:          state.layoutType          || null,
    focusGroup:          state.focusGroup          || null,
    visibleIds:          state.visibleIds          || [],
    lastCycleAt:         state.lastCycleAt         || 0,
    lastCycleDurationMs: state.lastCycleDurationMs || null,
  });
}

/** Claim a hero lock for a photo on this screen. */
export function sendHeroClaim(photoId, ttlSec) {
  return _send('hero_claim', {
    screenId: _screenId,
    photoId,
    ttlSec,
  });
}

/** Notify server that a coordinated slide is ready to advance. */
export function sendSlideReady(slideId, playlistId) {
  return _send('slide_ready', {
    slideId,
    playlistId,
    screenId: _screenId,
  });
}

/** Notify server that a slide finished playing. */
export function sendSlideEnded(slideId) {
  return _send('slide_ended', {
    slideId,
    screenId: _screenId,
  });
}
