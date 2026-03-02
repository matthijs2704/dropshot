// Optional sync progress badge for batched photo sync.

let _el = null;

function _ensureEl() {
  if (_el) return _el;
  _el = document.getElementById('sync-status');
  return _el;
}

export function showSyncStatus(sent, total) {
  const el = _ensureEl();
  if (!el) return;

  const s = Number(sent) || 0;
  const t = Number(total) || 0;
  if (t <= 0) {
    el.textContent = 'Syncing photos...';
  } else {
    el.textContent = `Syncing photos ${Math.min(s, t)}/${t}`;
  }
  el.classList.add('visible');
}

export function hideSyncStatus() {
  const el = _ensureEl();
  if (!el) return;
  el.classList.remove('visible');
}
