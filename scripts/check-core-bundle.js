'use strict';

/**
 * Bundle-size budget + zero-cost FFmpeg guarantee check for `@lightbird/core`.
 *
 * Enforces two things (see issue #54):
 *
 *  1. The base entry points (`dist/index.js`, `dist/index.cjs`) must NOT
 *     statically import any `@ffmpeg/*` package. A static import creates an
 *     unconditional dependency edge that defeats lazy loading — consumers who
 *     only play HTML5-native formats (MP4/WebM) would download FFmpeg code
 *     they never run. FFmpeg may only be reached through a dynamic `import()`
 *     (or the lazily-created Web Worker).
 *
 *  2. The gzipped base ESM entry must stay under `MAX_GZIP_BYTES` so the
 *     "lightweight" promise can't silently regress.
 *
 * Run after `pnpm --filter @lightbird/core build`. Wired into CI via
 * `.github/workflows/test.yml`.
 */

const { readFileSync, existsSync } = require('node:fs');
const { gzipSync } = require('node:zlib');
const { join } = require('node:path');

/** Gzipped budget for the base `@lightbird/core` ESM entry point. */
const MAX_GZIP_BYTES = 16 * 1024;

/**
 * Scans a built entry-point source for static `@ffmpeg/*` imports.
 * Dynamic `import('@ffmpeg/*')` is allowed and expected — only static
 * `import ... from` / `require()` edges are flagged.
 *
 * @param {string} source  Built JS source (ESM or CJS).
 * @returns {string[]}      Violation messages — empty array means clean.
 */
function auditEntrySource(source) {
  const violations = [];
  const staticEsmFrom = /import\b[^;\n]*\bfrom\s*['"]@ffmpeg\/[^'"]+['"]/;
  const staticEsmBare = /import\s+['"]@ffmpeg\/[^'"]+['"]/;
  const staticCjs = /\brequire\(\s*['"]@ffmpeg\/[^'"]+['"]\s*\)/;

  if (staticEsmFrom.test(source) || staticEsmBare.test(source)) {
    violations.push('static ESM import of an `@ffmpeg/*` package');
  }
  if (staticCjs.test(source)) {
    violations.push('static CJS require of an `@ffmpeg/*` package');
  }
  return violations;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function main() {
  const distDir = join(__dirname, '..', 'packages', 'lightbird', 'dist');
  const entries = [
    { label: 'ESM  index.js', file: 'index.js', enforceBudget: true },
    { label: 'CJS  index.cjs', file: 'index.cjs', enforceBudget: false },
  ];

  let failed = false;
  console.log('@lightbird/core — base bundle audit (issue #54)\n');

  for (const { label, file, enforceBudget } of entries) {
    const path = join(distDir, file);
    if (!existsSync(path)) {
      console.error(
        `  x ${label}: not found — run \`pnpm --filter @lightbird/core build\` first`,
      );
      failed = true;
      continue;
    }

    const buf = readFileSync(path);
    const gz = gzipSync(buf, { level: 9 }).length;
    const violations = auditEntrySource(buf.toString('utf8'));

    console.log(`  ${label.padEnd(15)} ${kb(buf.length)} raw  -  ${kb(gz)} gzip`);

    for (const violation of violations) {
      console.error(`    x ${violation} — FFmpeg must stay behind a dynamic import()`);
      failed = true;
    }
    if (enforceBudget && gz > MAX_GZIP_BYTES) {
      console.error(
        `    x gzipped size ${kb(gz)} exceeds budget ${kb(MAX_GZIP_BYTES)}`,
      );
      failed = true;
    }
  }

  console.log('');
  if (failed) {
    console.error(
      'Bundle audit FAILED — the base @lightbird/core entry must stay ' +
        'FFmpeg-free and within budget.',
    );
    process.exit(1);
  }
  console.log('Bundle audit passed — base entry is FFmpeg-free and within budget.');
}

if (require.main === module) {
  main();
}

module.exports = { auditEntrySource, MAX_GZIP_BYTES };
