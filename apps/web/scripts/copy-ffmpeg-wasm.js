const { cpSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..'); // apps/web/
const localSrc = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const hoistedSrc = join(root, '..', '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const dest = join(root, 'public', 'ffmpeg');
const src = existsSync(localSrc) ? localSrc : hoistedSrc;

if (!existsSync(src)) {
  console.warn('Warning: @ffmpeg/core not found. MKV playback will use CDN fallback.');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('Copied @ffmpeg/core WASM files to public/ffmpeg/');
