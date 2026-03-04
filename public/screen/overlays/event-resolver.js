// Event slot resolver: determines what to display in the info bar event slots.
//
// Pure logic — no DOM access, no module-level state.  All dependencies are
// passed as arguments so this module can be tested and reasoned about in
// isolation.

/**
 * Determine what to display in the event slot(s) of the info bar.
 *
 * Returns `{ primary, secondary }` where each is either a slot descriptor
 * `{ name, loc, remaining, targetMs, kind }` or `null`.
 *
 * Resolution priority for the primary slot:
 *   1. Explicit alert (set via `setInfoBarAlert`)
 *   2. Next upcoming event whose countdown window (countdownFromMinutes) is active
 *   3. Currently-running event (started but not ended)
 *   4. Soonest future event with countdownFromMinutes = 0 (always-visible)
 *
 * The secondary slot is populated only when there is no ticker and both a
 * current event and a next-event-in-countdown-window coexist — allowing the
 * bar to show both simultaneously.
 *
 * @param {Object}   cfg
 * @param {Array}    schedule      - sorted upcoming events from server
 * @param {Object|null} alert      - active bottom-bar countdown alert
 * @param {boolean}  hasTicker     - whether the ticker slot is visible
 * @returns {{ primary: Object|null, secondary: Object|null }}
 */
export function resolveEventSlots(cfg, schedule, alert, hasTicker) {
  if (alert) {
    const target = Number(new Date(alert.countdownTo || ''));
    const remaining = Number.isFinite(target) ? target - Date.now() : null;
    return {
      primary: { name: alert.message || '', loc: '', remaining, targetMs: target, kind: 'alert' },
      secondary: null,
    };
  }

  const now = Date.now();
  const sorted = schedule
    .map(e => ({ e, startMs: Number(new Date(e.startTime)) }))
    .filter(({ startMs }) => Number.isFinite(startMs))
    .sort((a, b) => a.startMs - b.startMs);

  const showCurrent = cfg.infoBarShowCurrentEvent !== false;
  const showNext    = cfg.infoBarShowNextEvent    !== false;

  // Next events that are upcoming
  const future = showNext ? sorted.filter(({ startMs }) => startMs > now) : [];

  // Find the soonest next event inside its countdown window (cfm > 0)
  let nextInWindow = null;
  for (const { e, startMs } of future) {
    const cfm = Number(e.countdownFromMinutes || 0);
    if (cfm > 0 && now >= startMs - (cfm * 60 * 1000)) {
      nextInWindow = { name: e.name || '', loc: e.location || '', remaining: startMs - now, targetMs: startMs, kind: 'next' };
      break;
    }
  }

  // Find current event — walk sorted backwards from the last past event
  let current = null;
  if (showCurrent) {
    // Find the index of the last event that has already started
    let lastPastIdx = -1;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].startMs <= now) { lastPastIdx = i; break; }
    }
    for (let i = lastPastIdx; i >= 0; i--) {
      const { e } = sorted[i];
      if (e.endTime) {
        const endMs = Number(new Date(e.endTime));
        if (Number.isFinite(endMs) && endMs <= now) continue;
      } else {
        // No explicit end time — the event ends when the next one in the schedule starts.
        const nextEvStartMs = sorted[i + 1]?.startMs;
        if (nextEvStartMs !== undefined && nextEvStartMs <= now) continue;
      }
      current = { name: e.name || '', loc: e.location || '', remaining: null, targetMs: null, kind: 'current' };
      break;
    }
  }

  // Both exist: primary = next-in-window (more urgent), secondary = current (when no ticker)
  if (nextInWindow && current) {
    return {
      primary:   nextInWindow,
      secondary: !hasTicker ? current : null,
    };
  }

  // Only next-in-window
  if (nextInWindow) return { primary: nextInWindow, secondary: null };

  // Only current
  if (current) return { primary: current, secondary: null };

  // Fallback: soonest next with cfm=0 (always visible)
  if (future.length) {
    const { e, startMs } = future[0];
    const cfm = Number(e.countdownFromMinutes || 0);
    if (cfm === 0) {
      return { primary: { name: e.name || '', loc: e.location || '', remaining: startMs - now, targetMs: startMs, kind: 'next' }, secondary: null };
    }
    return { primary: null, secondary: null };
  }

  return { primary: null, secondary: null };
}
