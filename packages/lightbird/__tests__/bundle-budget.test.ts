/**
 * Guards the zero-cost FFmpeg.wasm lazy-loading promise (issue #54):
 * the built base `@lightbird/core` entry must never statically import an
 * `@ffmpeg/*` package. FFmpeg may only be reached via a dynamic `import()`
 * (or the lazily-created Web Worker), so apps that only play HTML5-native
 * formats download zero FFmpeg code.
 *
 * Reads the built `dist/` artifacts — `pnpm turbo test` builds the package
 * first (see turbo.json), and CI builds before running tests.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const { auditEntrySource } = require('../../../scripts/check-core-bundle.js') as {
  auditEntrySource: (source: string) => string[];
};

const distDir = join(__dirname, '..', 'dist');

function readDist(file: string): string {
  const path = join(distDir, file);
  if (!existsSync(path)) {
    throw new Error(
      `dist/${file} not found. Build the package first: ` +
        '`pnpm --filter @lightbird/core build` (or run `pnpm turbo test`).',
    );
  }
  return readFileSync(path, 'utf8');
}

describe('auditEntrySource', () => {
  it('flags a static ESM `import ... from "@ffmpeg/*"`', () => {
    expect(
      auditEntrySource(`import { FFmpeg } from '@ffmpeg/ffmpeg';`),
    ).not.toHaveLength(0);
  });

  it('flags a static CJS `require("@ffmpeg/*")`', () => {
    expect(
      auditEntrySource(`var ff = require("@ffmpeg/util");`),
    ).not.toHaveLength(0);
  });

  it('allows a dynamic `import("@ffmpeg/*")`', () => {
    expect(auditEntrySource(`await import('@ffmpeg/ffmpeg');`)).toHaveLength(0);
  });

  it('ignores `@ffmpeg/*` substrings inside URL string literals', () => {
    expect(
      auditEntrySource(`const cdn = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";`),
    ).toHaveLength(0);
  });
});

describe('@lightbird/core base bundle — zero-cost FFmpeg guarantee (issue #54)', () => {
  it('ESM entry (dist/index.js) has no static @ffmpeg import', () => {
    expect(auditEntrySource(readDist('index.js'))).toEqual([]);
  });

  it('CJS entry (dist/index.cjs) has no static @ffmpeg import', () => {
    expect(auditEntrySource(readDist('index.cjs'))).toEqual([]);
  });

  it('reaches FFmpeg only through a dynamic import()', () => {
    const dynamic = /\bimport\(\s*['"]@ffmpeg\/[^'"]+['"]\s*\)/;
    expect(readDist('index.js')).toMatch(dynamic);
    expect(readDist('index.cjs')).toMatch(dynamic);
  });
});
