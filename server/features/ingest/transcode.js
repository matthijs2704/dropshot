'use strict';

const path         = require('path');
const fs           = require('fs');
const { spawn }    = require('child_process');

// Extensions that require transcoding to .mp4 for Chromium compatibility
const TRANSCODE_EXTS = /\.(mov|m4v)$/i;

/**
 * Returns true if the filename needs transcoding before it can be served
 * to a Chromium-based player.
 *
 * @param {string} filename
 * @returns {boolean}
 */
function needsTranscode(filename) {
  return TRANSCODE_EXTS.test(filename);
}

/**
 * Transcodes a .mov or .m4v file to an H.264/AAC .mp4 using ffmpeg.
 * The output file is written alongside the input with a .mp4 extension.
 *
 * @param {string} inputPath  Absolute path to the source file
 * @returns {Promise<string>} Resolves with the output .mp4 path on success
 */
function transcodeToMp4(inputPath) {
  const ext        = path.extname(inputPath);
  const outputPath = inputPath.slice(0, -ext.length) + '.mp4';
  const filename   = path.basename(inputPath);

  console.log(`[transcode] Starting: ${filename} → ${path.basename(outputPath)}`);

  return new Promise((resolve, reject) => {
    const args = [
      '-i',  inputPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',  // moov atom first — required for HTTP range streaming
      '-y',                        // overwrite without prompt
      outputPath,
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });

    proc.on('error', err => {
      if (err.code === 'ENOENT') {
        reject(new Error('ffmpeg not found — install ffmpeg to enable .mov/.m4v transcoding'));
      } else {
        reject(err);
      }
    });

    proc.on('close', code => {
      if (code === 0) {
        console.log(`[transcode] Done: ${path.basename(outputPath)}`);
        resolve(outputPath);
      } else {
        // Include last few lines of stderr for diagnosis
        const hint = stderr.split('\n').filter(Boolean).slice(-4).join(' | ');
        reject(new Error(`ffmpeg exited ${code}: ${hint}`));
      }
    });
  });
}

module.exports = { needsTranscode, transcodeToMp4 };
