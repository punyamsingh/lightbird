const { cpSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..'); // apps/web/
const dest = join(root, 'public', 'ffmpeg');

// Search multiple possible locations for @ffmpeg/core in pnpm monorepo
const candidates = [
  join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd'),
  join(root, '..', '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd'),
  join(root, '..', '..', 'packages', 'lightbird', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd'),
];

const src = candidates.find(p => existsSync(p));

if (!src) {
  console.warn('Warning: @ffmpeg/core not found. MKV playback will use CDN fallback.');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('Copied @ffmpeg/core WASM files to public/ffmpeg/');
