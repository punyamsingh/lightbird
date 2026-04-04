# Phase 6 — Build Configuration

## Goal

Set up tsup to build both packages into publishable ESM + CJS bundles with TypeScript declarations.

## Install tsup

In each package:
```bash
cd packages/lightbird && pnpm add -D tsup typescript
cd packages/ui && pnpm add -D tsup typescript tailwindcss postcss autoprefixer
```

## `packages/lightbird/tsup.config.ts`

```ts
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
```

**Output structure:**
```
packages/lightbird/dist/
├── index.js          (ESM)
├── index.cjs         (CJS)
├── index.d.ts        (types)
├── react/
│   ├── index.js      (ESM)
│   ├── index.cjs     (CJS)
│   └── index.d.ts    (types)
└── (chunks)
```

## `packages/lightbird/package.json` (complete)

```json
{
  "name": "lightbird",
  "version": "0.1.0",
  "description": "Client-side video player engine. Plays MKV, MP4, WebM with full subtitle, audio track, and chapter support. No server required.",
  "license": "MIT",
  "author": "Punyam Singh",
  "homepage": "https://lightbird.vercel.app/docs",
  "repository": {
    "type": "git",
    "url": "https://github.com/punyamsingh/lightbird",
    "directory": "packages/lightbird"
  },
  "keywords": [
    "video", "player", "mkv", "ffmpeg", "subtitles",
    "webm", "browser", "client-side", "wasm"
  ],
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./react": {
      "import": {
        "types": "./dist/react/index.d.ts",
        "default": "./dist/react/index.js"
      },
      "require": {
        "types": "./dist/react/index.d.cts",
        "default": "./dist/react/index.cjs"
      }
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "jest",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build"
  },
  "dependencies": {
    "ass-compiler": "^0.1.16",
    "chardet": "^2.1.1"
  },
  "optionalDependencies": {
    "@ffmpeg/ffmpeg": "^0.12.10",
    "@ffmpeg/core": "^0.12.6",
    "@ffmpeg/util": "^0.12.1"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true }
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

## `packages/lightbird/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["__tests__", "dist", "node_modules"]
}
```

## `packages/ui/tsup.config.ts`

```ts
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
```

The `banner: { js: '"use client";' }` ensures every output chunk has the directive, so Next.js consumers never need to wrap imports manually.

## `packages/ui/package.json` (complete)

```json
{
  "name": "@lightbird/ui",
  "version": "0.1.0",
  "description": "Drop-in React video player component powered by LightBird. Full controls, playlist, subtitles, chapters — one import.",
  "license": "MIT",
  "author": "Punyam Singh",
  "homepage": "https://lightbird.vercel.app/docs",
  "repository": {
    "type": "git",
    "url": "https://github.com/punyamsingh/lightbird",
    "directory": "packages/ui"
  },
  "keywords": [
    "video-player", "react", "component", "lightbird",
    "tailwind", "mkv", "subtitles"
  ],
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": ["*.css"],
  "scripts": {
    "build": "tsup && pnpm build:css",
    "build:css": "tailwindcss -i ./src/styles/input.css -o ./dist/styles.css --minify",
    "dev": "tsup --watch",
    "test": "jest",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-radio-group": "^1.2.3",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-slider": "^1.2.3",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-toast": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@tanstack/react-virtual": "^3.13.21",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "tailwind-merge": "^3.0.1"
  },
  "peerDependencies": {
    "lightbird": "^0.1.0",
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.4.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

## `packages/ui/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["__tests__", "dist", "node_modules"]
}
```

## Pre-compiled CSS setup

**`packages/ui/src/styles/input.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Default dark theme variables — used by the pre-compiled CSS.
   Users who integrate via Tailwind content config will define these
   in their own globals.css instead. */
:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
  --radius: 0.5rem;
}
```
These values are copied from the app's `globals.css` dark theme. Users importing `@lightbird/ui/styles.css` get this theme by default. Users using the Tailwind content config approach define their own variables.

**`packages/ui/tailwind.config.ts`:**
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Must include the CSS custom property-based colors to match the app theme
      // The pre-compiled CSS ships with default dark theme values for these vars
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

The `build:css` script compiles this into `dist/styles.css` with only the classes used by our components.

## Web Worker Bundling

The `ffmpeg-worker.ts` is the trickiest build artifact. Workers need to be loaded as separate files.

**Approach:** tsup builds the worker as a separate entry point:

```ts
// In tsup.config.ts, add a third config:
{
  entry: { 'workers/ffmpeg-worker': 'src/workers/ffmpeg-worker.ts' },
  format: ['esm'],
  noExternal: [/.*/],  // Bundle everything into the worker
  outDir: 'dist',
}
```

**In MKVPlayer, instantiate the worker using `import.meta.url`:**

```ts
const worker = new Worker(
  new URL('./workers/ffmpeg-worker.js', import.meta.url),
  { type: 'module' }
)
```

Most modern bundlers (Vite, webpack 5, esbuild, Next.js) understand `new URL(..., import.meta.url)` and handle the worker file correctly.

**Fallback:** If this causes issues in some bundlers, we can construct a blob URL from the worker code as a runtime fallback. Document this in troubleshooting.

## Verification

After this phase:
- `pnpm build --filter lightbird` produces `packages/lightbird/dist/`
- `pnpm build --filter @lightbird/ui` produces `packages/ui/dist/` including `styles.css`
- Both packages have correct `exports` in `package.json`
- TypeScript declarations are generated
- `pnpm build` (turbo) builds everything in the right order
