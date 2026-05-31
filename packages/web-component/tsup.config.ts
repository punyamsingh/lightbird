import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  // Core stays a separate, lazily-imported chunk so MP4/WebM playback
  // downloads zero core/FFmpeg bytes.
  external: ['@lightbird/core'],
})
