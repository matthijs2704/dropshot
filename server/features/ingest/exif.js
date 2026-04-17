'use strict';

const TIFF_HEADER_SIZE = 8;
const IFD_ENTRY_SIZE = 12;
const TYPE_ASCII = 2;
const TYPE_LONG = 4;

const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_DATETIME_DIGITIZED = 0x9004;

function _canRead(buf, offset, size) {
  return Buffer.isBuffer(buf) && Number.isInteger(offset) && Number.isInteger(size)
    && offset >= 0 && size >= 0 && offset + size <= buf.length;
}

function _readUInt16(buf, offset, littleEndian) {
  if (!_canRead(buf, offset, 2)) return null;
  return littleEndian ? buf.readUInt16LE(offset) : buf.readUInt16BE(offset);
}

function _readUInt32(buf, offset, littleEndian) {
  if (!_canRead(buf, offset, 4)) return null;
  return littleEndian ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
}

function _parseTimestamp(raw) {
  const value = String(raw || '').replace(/\0/g, '').trim();
  if (!value) return null;

  const normalized = value
    .replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    .replace(' ', 'T');

  if (/[zZ]|[+\-]\d{2}:?\d{2}$/.test(normalized)) {
    const parsed = Date.parse(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parts = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (!parts) return null;

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const hour = Number(parts[4]);
  const minute = Number(parts[5]);
  const second = Number(parts[6]);

  if (![year, month, day, hour, minute, second].every(Number.isFinite)) return null;

  return Date.UTC(year, month - 1, day, hour, minute, second);
}

function _readAsciiValue(buf, tiffStart, entryOffset, littleEndian) {
  const type = _readUInt16(buf, entryOffset + 2, littleEndian);
  const count = _readUInt32(buf, entryOffset + 4, littleEndian);
  if (type !== TYPE_ASCII || !Number.isFinite(count) || count <= 0) return null;

  const byteLength = count;
  if (byteLength <= 4) {
    if (!_canRead(buf, entryOffset + 8, byteLength)) return null;
    return buf.subarray(entryOffset + 8, entryOffset + 8 + byteLength).toString('ascii');
  }

  const valueOffset = _readUInt32(buf, entryOffset + 8, littleEndian);
  const absoluteOffset = tiffStart + valueOffset;
  if (!_canRead(buf, absoluteOffset, byteLength)) return null;
  return buf.subarray(absoluteOffset, absoluteOffset + byteLength).toString('ascii');
}

function _readLongValue(buf, tiffStart, entryOffset, littleEndian) {
  const type = _readUInt16(buf, entryOffset + 2, littleEndian);
  const count = _readUInt32(buf, entryOffset + 4, littleEndian);
  if (type !== TYPE_LONG || count !== 1) return null;

  const value = _readUInt32(buf, entryOffset + 8, littleEndian);
  if (!Number.isFinite(value)) return null;
  if (!_canRead(buf, tiffStart + value, 0)) return null;
  return value;
}

function _findIfdEntryOffset(buf, tiffStart, ifdOffset, tagId, littleEndian) {
  const absoluteOffset = tiffStart + ifdOffset;
  const count = _readUInt16(buf, absoluteOffset, littleEndian);
  if (!Number.isFinite(count)) return null;

  for (let i = 0; i < count; i++) {
    const entryOffset = absoluteOffset + 2 + (i * IFD_ENTRY_SIZE);
    if (!_canRead(buf, entryOffset, IFD_ENTRY_SIZE)) return null;
    const currentTag = _readUInt16(buf, entryOffset, littleEndian);
    if (currentTag === tagId) return entryOffset;
  }

  return null;
}

function _readAsciiTag(buf, tiffStart, ifdOffset, tagId, littleEndian) {
  const entryOffset = _findIfdEntryOffset(buf, tiffStart, ifdOffset, tagId, littleEndian);
  if (entryOffset == null) return null;
  return _readAsciiValue(buf, tiffStart, entryOffset, littleEndian);
}

function _readLongTag(buf, tiffStart, ifdOffset, tagId, littleEndian) {
  const entryOffset = _findIfdEntryOffset(buf, tiffStart, ifdOffset, tagId, littleEndian);
  if (entryOffset == null) return null;
  return _readLongValue(buf, tiffStart, entryOffset, littleEndian);
}

function parseExifCaptureAt(exif) {
  if (!Buffer.isBuffer(exif) || exif.length < TIFF_HEADER_SIZE) return null;

  const tiffStart = exif.subarray(0, 6).toString('ascii') === 'Exif\0\0' ? 6 : 0;
  if (!_canRead(exif, tiffStart, TIFF_HEADER_SIZE)) return null;

  const byteOrder = exif.subarray(tiffStart, tiffStart + 2).toString('ascii');
  if (byteOrder !== 'II' && byteOrder !== 'MM') return null;
  const littleEndian = byteOrder === 'II';

  const magic = _readUInt16(exif, tiffStart + 2, littleEndian);
  if (magic !== 42) return null;

  const ifd0Offset = _readUInt32(exif, tiffStart + 4, littleEndian);
  if (!Number.isFinite(ifd0Offset)) return null;

  const originalDate = _readLongTag(exif, tiffStart, ifd0Offset, TAG_EXIF_IFD, littleEndian);
  if (Number.isFinite(originalDate)) {
    const dtOriginal = _readAsciiTag(exif, tiffStart, originalDate, TAG_DATETIME_ORIGINAL, littleEndian);
    const parsedOriginal = _parseTimestamp(dtOriginal);
    if (Number.isFinite(parsedOriginal)) return parsedOriginal;

    const dtDigitized = _readAsciiTag(exif, tiffStart, originalDate, TAG_DATETIME_DIGITIZED, littleEndian);
    const parsedDigitized = _parseTimestamp(dtDigitized);
    if (Number.isFinite(parsedDigitized)) return parsedDigitized;
  }

  const dt = _readAsciiTag(exif, tiffStart, ifd0Offset, TAG_DATETIME, littleEndian);
  const parsed = _parseTimestamp(dt);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseXmpCaptureAt(xmp) {
  if (!Buffer.isBuffer(xmp) || xmp.length === 0) return null;

  const xml = xmp.toString('utf8');
  const patterns = [
    /DateTimeOriginal="([^"]+)"/i,
    /<exif:DateTimeOriginal>([^<]+)</i,
    /CreateDate="([^"]+)"/i,
    /<xmp:CreateDate>([^<]+)</i,
    /DateCreated="([^"]+)"/i,
    /<photoshop:DateCreated>([^<]+)</i,
  ];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    const parsed = _parseTimestamp(match?.[1]);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function extractCapturedAt(metadata) {
  const exifTime = parseExifCaptureAt(metadata?.exif);
  if (Number.isFinite(exifTime)) return exifTime;

  const xmpTime = parseXmpCaptureAt(metadata?.xmp);
  if (Number.isFinite(xmpTime)) return xmpTime;

  return null;
}

module.exports = {
  extractCapturedAt,
  parseExifCaptureAt,
  parseXmpCaptureAt,
};
