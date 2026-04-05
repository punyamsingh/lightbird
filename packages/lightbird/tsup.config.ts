import { defineConfig } from 'tsup'

export default defineConfig([
  // Main entry (framework-agnostic core)
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    treeshake: true,
    clean: true,
    outDir: 'dist',
    external: [
      'react',
      '@ffmpeg/ffmpeg',
      '@ffmpeg/core',
      '@ffmpeg/util',
    ],
  },
  // React subpath (hooks)
  {
    entry: { 'react/index': 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    treeshake: true,
    outDir: 'dist',
    external: [
      'react',
      '@ffmpeg/ffmpeg',
      '@ffmpeg/core',
      '@ffmpeg/util',
    ],
  },
])
