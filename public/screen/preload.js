// Image preloading queue with bounded concurrency.
// Keeps the display loop smooth on high-latency connections.

import { photoUrl } from '../shared/utils.js';

const MAX_CONCURRENT = 4;

const _queue = [];
const _queuedUrls = new Set();
const _inflightUrls = new Set();
const _loadedUrls = new Set();
const _loadedDisplayIds = new Set();

function _enqueue(url, onLoad) {
  if (!url) return;
  if (_loadedUrls.has(url) || _queuedUrls.has(url) || _inflightUrls.has(url)) return;
  _queue.push({ url, onLoad });
  _queuedUrls.add(url);
}

function _drain() {
  while (_inflightUrls.size < MAX_CONCURRENT && _queue.length) {
    const next = _queue.shift();
    if (!next) break;

    const { url, onLoad } = next;
    _queuedUrls.delete(url);
    _inflightUrls.add(url);

    const img = new Image();
    img.onload = () => {
      _inflightUrls.delete(url);
      _loadedUrls.add(url);
      if (onLoad) onLoad();
      _drain();
    };
    img.onerror = () => {
      _inflightUrls.delete(url);
      _drain();
    };
    img.src = url;
  }
}

export function preloadPhoto(photo) {
  if (!photo?.id) return;

  const displayUrl = photoUrl(photo);
  const thumbUrl = photo.thumbUrl || '';

  if (displayUrl) {
    if (_loadedUrls.has(displayUrl)) {
      _loadedDisplayIds.add(photo.id);
    } else {
      _enqueue(displayUrl, () => {
        _loadedDisplayIds.add(photo.id);
      });
    }
  }

  if (thumbUrl) _enqueue(thumbUrl);
  _drain();
}

export function preloadBatch(photos) {
  if (!Array.isArray(photos)) return;
  for (const photo of photos) preloadPhoto(photo);
}

export function isPreloaded(photoId) {
  return _loadedDisplayIds.has(photoId);
}

export function clearPreloaded(photoId) {
  _loadedDisplayIds.delete(photoId);
}

export function getPreloadedCount() {
  return _loadedDisplayIds.size;
}
