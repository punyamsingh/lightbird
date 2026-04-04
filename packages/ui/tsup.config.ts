import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  banner: {
    js: '"use client";',
  },
  external: [
    'react',
    'react-dom',
    'lightbird',
    'lightbird/react',
  ],
})
