/**
 * Copies @ffmpeg/core WASM files from node_modules to public/ffmpeg/ so they
 * are served from the same origin as the app. This avoids Cross-Origin-Resource-Policy
 * (COEP) restrictions that block loading them from unpkg.com at runtime.
 *
 * Run automatically via the "prebuild" / "predev" npm scripts.
 */

const { cpSync, mkdirSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const src  = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const dest = join(root, 'public', 'ffmpeg');

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('Copied @ffmpeg/core WASM files to public/ffmpeg/');
