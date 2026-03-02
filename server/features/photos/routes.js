'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fsp     = require('fs').promises;
const fs      = require('fs');

const state   = require('../../state');
const { broadcast }  = require('../ws/broadcast');
const { serializePhoto, getAllPhotos } = require('./serialize');
const { upsertPhotoFromPath, PHOTOS_DIR } = require('../ingest/index');
const { toCacheFilePath, toThumbFilePath } = require('../ingest/process');
const { setHeroCandidate, deletePhotoMetadata, upsertPhotoMetadata } = require('../../db');

const router = express.Router();

// multer: store in memory then write ourselves so we control destination path
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB per file
  fileFilter(_req, file, cb) {
    const valid = /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.originalname);
    cb(null, valid);
  },
});

// Validate a group name: alphanumeric, hyphens, underscores, max 50 chars
function isValidGroupName(name) {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(name);
}

// ---------------------------------------------------------------------------
// GET /api/photos — all photos (newest first)
// Query params (all optional):
//   status=ready|queued|processing|failed  — filter by status
//   limit=N                                — return at most N results
//   random=1                               — shuffle before slicing
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  let photos = getAllPhotos();

  const { status, limit, random } = req.query;

  if (status) {
    photos = photos.filter(p => p.status === status);
  }

  if (random === '1' || random === 'true') {
    for (let i = photos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photos[i], photos[j]] = [photos[j], photos[i]];
    }
  }

  const limitN = Number(limit);
  if (Number.isInteger(limitN) && limitN > 0) {
    photos = photos.slice(0, limitN);
  }

  res.json(photos);
});

// ---------------------------------------------------------------------------
// POST /api/upload — multipart upload with optional group
// ---------------------------------------------------------------------------
router.post('/upload', upload.array('files', 200), async (req, res) => {
  const rawGroup = (req.body.group || '').trim();
  const group    = rawGroup && rawGroup !== 'ungrouped' ? rawGroup : null;

  if (group && !isValidGroupName(group)) {
    return res.status(400).json({ ok: false, error: 'Invalid group name. Use letters, numbers, hyphens or underscores (max 50 chars).' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ ok: false, error: 'No files received.' });
  }

  const destDir = group ? path.join(PHOTOS_DIR, group) : PHOTOS_DIR;
  await fsp.mkdir(destDir, { recursive: true });

  const uploaded = [];
  const errors   = [];

  for (const file of req.files) {
    // Sanitize filename — keep extension, strip path separators
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const destPath = path.join(destDir, safeName);

    try {
      await fsp.writeFile(destPath, file.buffer);
      // chokidar will pick this up; also kick off processing immediately
      await upsertPhotoFromPath(destPath);
      uploaded.push({ name: safeName, group: group || 'ungrouped' });
    } catch (err) {
      errors.push({ name: safeName, error: err.message });
    }
  }

  res.json({ ok: true, uploaded, errors });
});

// ---------------------------------------------------------------------------
// PATCH /api/photos/:id — set heroCandidate flag
// id is URL-encoded, e.g. "ceremony%2Fimg001.jpg"
// ---------------------------------------------------------------------------
router.patch('/:id(*)', async (req, res) => {
  const id = req.params.id;
  if (!state.photosById.has(id)) {
    return res.status(404).json({ ok: false, error: 'Photo not found' });
  }

  const { heroCandidate } = req.body;
  if (typeof heroCandidate !== 'boolean') {
    return res.status(400).json({ ok: false, error: 'heroCandidate must be a boolean' });
  }

  const existing = state.photoOverrides.get(id) || {};
  state.photoOverrides.set(id, { ...existing, heroCandidate });
  setHeroCandidate(id, heroCandidate).catch(err => {
    console.warn(`[photos] failed to persist heroCandidate for ${id}: ${err.message}`);
  });

  const photo = state.photosById.get(id);
  upsertPhotoMetadata(photo).catch(err => {
    console.warn(`[photos] failed to persist metadata for ${id}: ${err.message}`);
  });
  broadcast({ type: 'photo_update', photo: serializePhoto(photo) });

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// DELETE /api/photos/:id — permanently delete source + cache
// ---------------------------------------------------------------------------
router.delete('/:id(*)', async (req, res) => {
  const id    = req.params.id;
  const photo = state.photosById.get(id);

  if (!photo) {
    return res.status(404).json({ ok: false, error: 'Photo not found' });
  }

  // Remove from registry first so screens stop showing it immediately
  state.photosById.delete(id);
  state.queuedSet.delete(id);
  const qi = state.queue.indexOf(id);
  if (qi >= 0) state.queue.splice(qi, 1);
  state.photoOverrides.delete(id);

  // Broadcast removal so screens + admin update instantly
  broadcast({ type: 'remove_photo', id, name: photo.name });

  // Delete files (best-effort — don't fail the request if files are already gone)
  const deleteFile = async filePath => {
    try { await fsp.unlink(filePath); } catch {}
  };

  await deleteFile(photo.sourcePath);

  const cachePath = photo.cachePath || toCacheFilePath(id);
  const thumbPath = photo.thumbPath || toThumbFilePath(id);
  await deleteFile(cachePath);
  await deleteFile(thumbPath);

  deletePhotoMetadata(id).catch(err => {
    console.warn(`[photos] failed to delete metadata for ${id}: ${err.message}`);
  });

  res.json({ ok: true });
});

module.exports = router;
