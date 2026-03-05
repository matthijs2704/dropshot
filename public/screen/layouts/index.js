// Layout cycle dispatcher: loads layout descriptors, picks layout type,
// builds DOM, runs transitions.

import { buildSubmissionWall } from './submissionwall.js';
import { runTransition }    from '../transitions.js';
import {
  pickPhotos,
  pickHeroPhoto,
  markAsHeroShown,
  photoRegistry,
} from '../photos.js';
import {
  hasApprovedSubmissions,
  pickSubmissionWindow,
  updateSubmissionWallSettings,
  getSubmissionWallOptions,
} from '../submissions.js';
import { sendHeroClaim } from '../ws-send.js';
import {
  initSlides,
  runNextSlide,
  getInterleaveEvery,
  hasPlaySoon,
  updateSlidesConfig,
} from '../slides/index.js';
import { getBottomInset } from '../overlays/index.js';
import { getScreenCfg } from '../../shared/utils.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POST_SLIDE_DELAY_MS   = 500;    // pause after slide before next photo cycle
const NO_CONFIG_RETRY_MS    = 1000;   // retry interval when config not yet available
const DEFAULT_LAYOUT_DUR_MS = 8000;   // fallback layout duration
const DEFAULT_HERO_LOCK_SEC = 30;     // cross-screen hero lock TTL

// Layout module paths, keyed by layout name.
// Dynamic import() loads each on first use; broken files are skipped.
const _LAYOUT_PATHS = {
  fullscreen:  './fullscreen.js',
  sidebyside:  './sidebyside.js',
  featuredduo: './featuredduo.js',
  polaroid:    './polaroid.js',
  mosaic:      './mosaic.js',
};

// Display state shared with heartbeat
export const displayState = {
  layoutType:          null,
  focusGroup:          null,
  visibleIds:          [],
  lastCycleAt:         0,
  lastCycleDurationMs: null,
};

let _container       = null;
let _currentEl       = null;
let _config          = null;
let _globalConfig    = null;
let _heroLocks       = new Map();
let _screenId        = null;
let _cycleTimer      = null;
let _running         = false;
let _destroyCurrent  = null;    // cleanup fn from current layout (e.g. submission wall paging)
let _photoCycleCount = 0;       // counts photo layouts since last slide interleave
let _lastSubmissionWallAt = Date.now();

/** @type {Map<string, Object>} name → layout descriptor (populated by _loadLayouts) */
let _layouts = new Map();

// ---------------------------------------------------------------------------
// Layout loading
// ---------------------------------------------------------------------------

/**
 * Dynamically import all layout modules.  Each module must export a `layout`
 * descriptor with { name, minPhotos, pick, build, postMount? }.
 *
 * Broken or missing layout files are skipped with a warning — they won't
 * crash the cycle.
 */
async function _loadLayouts() {
  const entries = Object.entries(_LAYOUT_PATHS);
  const results = await Promise.allSettled(
    entries.map(([, path]) => import(path)),
  );

  for (let i = 0; i < entries.length; i++) {
    const [name] = entries[i];
    const result = results[i];
    if (result.status === 'fulfilled' && result.value?.layout) {
      _layouts.set(name, result.value.layout);
    } else {
      const reason = result.status === 'rejected' ? result.reason?.message : 'no layout export';
      console.warn(`[layouts] skipping ${name}: ${reason}`);
    }
  }
}

// Kick off layout loading immediately (top-level await not used so the
// module evaluates synchronously; _loadLayouts resolves before the first
// runCycle fires because initCycle + config must arrive first).
const _layoutsReady = _loadLayouts();

// ---------------------------------------------------------------------------
// Helpers object passed to layout.pick()
// ---------------------------------------------------------------------------

function _buildHelpers() {
  return {
    pickPhotos,
    pickAndClaimHero: _pickAndClaimHero,
  };
}

// ---------------------------------------------------------------------------
// Init / config
// ---------------------------------------------------------------------------

/**
 * Initialise the cycle engine.
 */
export function initCycle(container, screenId) {
  _container = container;
  _screenId  = screenId;
  initSlides(container, screenId);
}

export function updateConfig(config) {
  _globalConfig = config || {};
  _config = getScreenCfg(config, _screenId);
  updateSubmissionWallSettings(config || {});
  updateSlidesConfig(config);
}

export function updateHeroLocks(locks) {
  _heroLocks = new Map(locks.map(l => [l.photoId, l]));
}

/**
 * Start the layout cycle loop.
 */
export function startCycle() {
  if (_running) return;
  _running = true;

  const phaseMs = _config?.cyclePhaseMs || 0;
  setTimeout(runCycle, phaseMs);
}

export function stopCycle() {
  _running = false;
  if (_cycleTimer) { clearTimeout(_cycleTimer); _cycleTimer = null; }
  if (_destroyCurrent) { _destroyCurrent(); _destroyCurrent = null; }
}

// ---------------------------------------------------------------------------
// Pool size helpers
// ---------------------------------------------------------------------------

/**
 * Count ready photos in the current pool (respects group filtering).
 * Used to downgrade layouts when the pool is too small.
 */
function _readyPoolSize(cfg) {
  const groupMode   = cfg.groupMode  || 'auto';
  const activeGroup = cfg.activeGroup || 'ungrouped';
  const all = Array.from(photoRegistry.values()).filter(p => p.status === 'ready');
  if (groupMode !== 'manual') return all.length;
  return all.filter(p => p.eventGroup === activeGroup).length || all.length;
}

// ---------------------------------------------------------------------------
// Submission wall (separate code path — not a photo layout)
// ---------------------------------------------------------------------------

/**
 * Build a submission wall layout.  Returns null when the wall should be
 * skipped (empty items + hideWhenEmpty), signalling runCycle to fall back.
 */
function _buildSubmissionWallLayout(cycleStart, submissionMode, hasSubmissions, hideWhenEmpty, wallOptions) {
  const mode = submissionMode === 'off' ? 'both' : submissionMode;
  const pageSize = 6;
  const count = mode === 'single' ? 1 : pageSize * 4;
  const items = hasSubmissions ? pickSubmissionWindow(count, Math.max(24, pageSize * 8)) : [];

  if (!items.length && hideWhenEmpty) return null;

  const effectiveMode = items.length ? mode : 'single';
  const built = buildSubmissionWall(items, effectiveMode, wallOptions);
  const duration = Math.max(5000, Math.min(120000, Number(_globalConfig?.submissionDisplayDurationSec || 12) * 1000));
  _lastSubmissionWallAt = cycleStart;

  return { built, layoutType: 'submissionwall', duration };
}

// ---------------------------------------------------------------------------
// Layout selection (pool-size aware)
// ---------------------------------------------------------------------------

/**
 * Choose which layouts are eligible based on pool size and admin config.
 * Returns an array of layout names.
 *
 * @param {Object} cfg
 * @param {number} poolSize
 * @returns {{ candidates: string[], cfg: Object }}
 */
function _selectCandidates(cfg, poolSize) {
  const allNames = Array.from(_layouts.keys());

  // Filter by pool size — only layouts whose minPhotos we can satisfy
  let eligible = allNames.filter(name => {
    const desc = _layouts.get(name);
    return poolSize >= (desc?.minPhotos || 1);
  });

  // For small pools (4-5), restrict mosaic to uniform templates only
  if (poolSize <= 5 && eligible.includes('mosaic')) {
    cfg = { ...cfg, templateEnabled: (cfg.templateEnabled || []).filter(t => t.startsWith('uniform')) };
    if (!cfg.templateEnabled.length) cfg = { ...cfg, templateEnabled: ['uniform-4', 'uniform-6'] };
  }

  // Intersect with admin-enabled layouts (but always keep at least fullscreen)
  const adminEnabled = cfg.enabledLayouts || allNames;
  let candidates = eligible.filter(l => adminEnabled.includes(l));
  if (!candidates.length) candidates = ['fullscreen'];

  return { candidates, cfg };
}

// ---------------------------------------------------------------------------
// Core cycle
// ---------------------------------------------------------------------------

async function runCycle() {
  // Ensure layouts are loaded before first cycle
  await _layoutsReady;

  if (!_running || !_config) {
    _cycleTimer = setTimeout(runCycle, NO_CONFIG_RETRY_MS);
    return;
  }

  let cfg = _config;

  // ── Slide interleave check ────────────────────────────────────────────────
  // Trigger if: counter reached the threshold, OR a Play Soon is pending.
  // Play Soon can fire even without a playlist (interleaveEvery === 0).
  const interleaveEvery = getInterleaveEvery();
  const shouldPlaySlide = hasPlaySoon() ||
    (interleaveEvery > 0 && _photoCycleCount >= interleaveEvery);

  if (shouldPlaySlide) {
    _photoCycleCount = 0;
    const played = await runNextSlide(_currentEl);
    if (!_running) return;
    if (played) {
      // The slide runner swapped _currentEl via runTransition.
      // Sync our pointer to the new element.
      const children = Array.from(_container.children);
      _currentEl = children[children.length - 1] || _currentEl;
      for (const child of children.slice(0, -1)) child.remove();

      _cycleTimer = setTimeout(runCycle, POST_SLIDE_DELAY_MS);
      return;
    }
    // Nothing played (no playlist / all disabled) — fall through to photo cycle
  }

  const cycleStart = Date.now();
  const submissionMode = _globalConfig?.submissionDisplayMode || 'off';
  const wallOptions = { ...getSubmissionWallOptions(), bottomInset: getBottomInset() };
  const hasSubmissions = hasApprovedSubmissions();
  const hideWhenEmpty = wallOptions.hideWhenEmpty !== false;
  const submissionsEnabled = submissionMode !== 'off' && (hasSubmissions || !hideWhenEmpty);
  const submissionIntervalMs = Math.max(10, Number(_globalConfig?.submissionDisplayIntervalSec || 45)) * 1000;
  const shouldRunSubmissionWall = submissionsEnabled && ((cycleStart - _lastSubmissionWallAt) >= submissionIntervalMs);

  const poolSize = _readyPoolSize(cfg);
  const { candidates, cfg: adjustedCfg } = _selectCandidates(cfg, poolSize);
  cfg = adjustedCfg;

  let layoutType = candidates[Math.floor(Math.random() * candidates.length)];
  if (shouldRunSubmissionWall) {
    layoutType = 'submissionwall';
  }

  // ── Build the chosen layout ──────────────────────────────────────────────
  // Tear down previous layout (e.g. submission wall paging timers)
  if (_destroyCurrent) { _destroyCurrent(); _destroyCurrent = null; }

  let built, resolvedType, slotEls, layoutDesc;

  if (layoutType === 'submissionwall') {
    const result = _buildSubmissionWallLayout(cycleStart, submissionMode, hasSubmissions, hideWhenEmpty, wallOptions);
    if (result) {
      built        = result.built;
      resolvedType = result.layoutType;
      cfg = { ...cfg, _overrideDuration: result.duration };
    } else {
      layoutType = 'fullscreen';  // fall back when wall is empty
    }
  }

  if (!built) {
    layoutDesc = _layouts.get(layoutType) || _layouts.get('fullscreen');
    const helpers = _buildHelpers();
    const picked  = layoutDesc.pick(cfg, helpers);
    built         = layoutDesc.build(picked, cfg);
    resolvedType  = built.templateName || layoutDesc.name;
    slotEls       = built.slotEls || null;
  }

  const duration = cfg._overrideDuration || cfg.layoutDuration || DEFAULT_LAYOUT_DUR_MS;

  displayState.layoutType = resolvedType;
  _destroyCurrent = built.destroy || null;

  const newEl      = built.el;
  const visibleIds = built.visibleIds;

  // Mount new element (hidden behind current)
  newEl.style.opacity = '0';
  _container.appendChild(newEl);

  // Start Ken Burns BEFORE the layout transition so the image is already in
  // motion when it fades in. This avoids any snap/jump that occurs when Ken
  // Burns is started after the transition completes (active CSS transitions on
  // the element interfere with setting a new transform state).
  if (cfg.kenBurnsEnabled !== false && built.startMotion) {
    built.startMotion(duration);
  }

  // Transition
  await runTransition(_currentEl, newEl, cfg.transition || 'fade', cfg.transitionTime || 800);
  if (!_running) return;
  _currentEl = newEl;

  // Update display state
  displayState.visibleIds          = visibleIds;
  displayState.lastCycleAt         = cycleStart;
  displayState.lastCycleDurationMs = Date.now() - cycleStart;
  displayState.focusGroup          = cfg.groupMode === 'manual' ? cfg.activeGroup : null;

  // Run post-mount logic (e.g. mosaic tile swaps)
  if (layoutDesc?.postMount && slotEls) {
    layoutDesc.postMount({
      slotEls,
      cfg,
      cycleStart,
      visibleIds,
      pickMorePhotos: (count, options = {}) =>
        pickPhotos(
          count,
          cfg,
          [...visibleIds, ...(options.excludeIds || [])],
          false,
          {
            orientation: options.orientation || 'any',
            enforceOrientation: options.enforceOrientation,
            orientationBoost: options.orientationBoost,
          },
        ),
    }).then(newIds => {
      if (newIds) displayState.visibleIds = [...new Set([...displayState.visibleIds, ...newIds])];
    }).catch(() => {});
  }

  // Count completed photo cycles (for slide interleave)
  _photoCycleCount += 1;

  // Schedule next cycle
  _cycleTimer = setTimeout(runCycle, duration);
}

// ---------------------------------------------------------------------------
// Hero picking helpers
// ---------------------------------------------------------------------------

function _claimHero(photoId, ttlSec) {
  sendHeroClaim(photoId, ttlSec);
}

/**
 * Pick a hero photo, claim the cross-screen lock, and mark it as hero-shown.
 * Falls back to pickPhotos when no hero candidate passes the cooldown check.
 *
 * @param {Object}  cfg
 * @param {Object}  [options]        - orientation options forwarded to pickHeroPhoto
 * @param {boolean} [useFallback=true] - try pickPhotos if pickHeroPhoto returns null
 * @returns {Object|null} the chosen photo, or null if pool is empty
 */
function _pickAndClaimHero(cfg, options = {}, useFallback = true) {
  const hero = pickHeroPhoto(cfg, _heroLocks, _screenId, options);
  const photo = hero || (useFallback
    ? pickPhotos(1, cfg, [], true, options)[0] || null
    : null);

  if (photo) {
    _claimHero(photo.id, cfg.crossScreenHeroLockSec || DEFAULT_HERO_LOCK_SEC);
    markAsHeroShown(photo.id);
  }

  return photo;
}
