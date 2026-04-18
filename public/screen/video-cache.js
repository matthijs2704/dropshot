const VIDEO_CACHE = 'pixelplein-videos';
const _pending = new Map();

function _videoUrl(filename) {
  return `/slide-assets/videos/${encodeURIComponent(filename)}`;
}

export function getVideoRequestUrl(filename) {
  return _videoUrl(filename);
}

export async function cacheVideoFile(filename) {
  if (!filename) throw new Error('Missing video filename');

  const url = _videoUrl(filename);
  const existing = _pending.get(url);
  if (existing) return existing;

  const work = (async () => {
    if (typeof caches === 'undefined') {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Video fetch failed: ${response.status}`);
      return response;
    }

    const cache = await caches.open(VIDEO_CACHE);
    let response = await cache.match(url);
    if (response) return response;

    response = await fetch(url);
    if (!response.ok) throw new Error(`Video fetch failed: ${response.status}`);
    await cache.put(url, response.clone());
    return response;
  })();

  _pending.set(url, work);
  try {
    return await work;
  } finally {
    _pending.delete(url);
  }
}

export async function getVideoObjectUrl(filename) {
  const response = await cacheVideoFile(filename);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
