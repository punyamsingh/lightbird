import { defineConfig } from 'tsup'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  external: [
    'react',
    'react-dom',
    '@lightbird/core',
    '@lightbird/core/react',
  ],
  onSuccess: async () => {
    // Prepend "use client" directive to output files
    for (const file of ['dist/index.js', 'dist/index.cjs']) {
      const fullPath = join(process.cwd(), file)
      try {
        const content = readFileSync(fullPath, 'utf-8')
        writeFileSync(fullPath, `"use client";\n${content}`)
      } catch {}
    }
  },
})
