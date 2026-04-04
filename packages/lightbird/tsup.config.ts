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
    noExternal: [],
    external: [
      'react',
      '@ffmpeg/ffmpeg',
      '@ffmpeg/core',
      '@ffmpeg/util',
      /workers\/create-worker/,
    ],
  },
  // Worker factory (separate chunk — uses import.meta.url)
  {
    entry: { 'workers/create-worker': 'src/workers/create-worker.ts' },
    format: ['esm'],
    outDir: 'dist',
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
