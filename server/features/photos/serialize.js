'use strict';

const state = require('../../state');

function serializePhoto(photo) {
  const override = state.photoOverrides.get(photo.id) || {};
  return {
    id:            photo.id,
    relativePath:  photo.relativePath,
    name:          photo.name,
    eventGroup:    photo.eventGroup,
    status:        photo.status,
    addedAt:       photo.addedAt,
    processedAt:   photo.processedAt || null,
    width:         photo.width,
    height:        photo.height,
    displayWidth:  photo.displayWidth,
    displayHeight: photo.displayHeight,
    url:           photo.displayUrl,
    displayUrl:    photo.displayUrl,
    thumbUrl:      photo.thumbUrl || null,
    sourceUrl:     photo.sourceUrl,
    error:         photo.error || null,
    heroCandidate: Boolean(override.heroCandidate),
  };
}

function getReadyPhotos() {
  return Array.from(state.photosById.values())
    .filter(p => p.status === 'ready')
    .sort((a, b) => a.addedAt - b.addedAt)
    .map(serializePhoto);
}

function getAllPhotos() {
  return Array.from(state.photosById.values())
    .sort((a, b) => b.addedAt - a.addedAt)
    .map(serializePhoto);
}

module.exports = { serializePhoto, getReadyPhotos, getAllPhotos };
