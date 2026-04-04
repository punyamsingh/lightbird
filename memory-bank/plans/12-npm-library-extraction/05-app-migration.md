# Phase 5 — App Migration (`apps/web/`)

## Goal

Move the existing Next.js app into `apps/web/` and rewire it to import from `lightbird` and `@lightbird/ui`. The app at lightbird.vercel.app continues to work exactly as before.

## What Moves

### Into `apps/web/`

| Source | Destination |
|--------|-------------|
| `src/app/` | `apps/web/src/app/` |
| `public/` | `apps/web/public/` |
| `next.config.ts` | `apps/web/next.config.ts` |
| `tailwind.config.ts` | `apps/web/tailwind.config.ts` |
| `postcss.config.mjs` | `apps/web/postcss.config.mjs` |
| `scripts/copy-ffmpeg-wasm.js` | `apps/web/scripts/copy-ffmpeg-wasm.js` |
| `.env.example` | `apps/web/.env.example` |
| `jest.setup.ts` | Split — see Phase 7 |
| `jest.config.ts` | Split — see Phase 7 |

### What stays at root

| File | Why |
|------|-----|
| `.github/` | CI/CD is repo-level |
| `.gitignore` | Repo-level (update to include `packages/*/dist`) |
| `memory-bank/` | Documentation is repo-level |
| `CLAUDE.md` | Repo-level instructions (update paths — see Phase 12) |
| `LICENSE` | Repo-level |
| `pnpm-workspace.yaml` | Workspace config (Phase 1) |
| `turbo.json` | Task runner config (Phase 1) |
| `tsconfig.base.json` | Shared TS config (Phase 1) |
| Root `package.json` | Workspace root |

## Exact File Contents After Migration

### `apps/web/src/app/page.tsx`

```tsx
import { LightBirdPlayer, PlayerErrorBoundary } from "@lightbird/ui";

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header className="px-6 py-3 border-b border-border flex items-center shrink-0">
        <h1 className="text-xl font-headline font-black tracking-widest" style={{color: 'hsl(var(--accent))'}}>LIGHTBIRD</h1>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <PlayerErrorBoundary>
          <LightBirdPlayer />
        </PlayerErrorBoundary>
      </div>
    </main>
  );
}
```

### `apps/web/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@lightbird/ui";

export const metadata: Metadata = {
  title: "LightBird",
  description: "A modern, feature-rich video player.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

Key changes:
- `cn()` import removed (no longer needed — was only used for `className` on `<body>`)
- `Toaster` imported from `@lightbird/ui` instead of `@/components/ui/toaster`

### `apps/web/src/app/globals.css`

**Stays as-is.** This file contains:
- `@tailwind base; @tailwind components; @tailwind utilities;`
- CSS custom properties for the dark theme (`--background`, `--foreground`, `--accent`, etc.)
- These variables are consumed by Tailwind via `hsl(var(--background))` etc.

This file stays in the app because it defines the app's theme. The `@lightbird/ui` pre-compiled CSS will include its own default values for these variables.

### `apps/web/package.json`

```json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "copy:ffmpeg": "node scripts/copy-ffmpeg-wasm.js",
    "predev": "npm run copy:ffmpeg",
    "dev": "next dev -p 9002",
    "prebuild": "npm run copy:ffmpeg",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "lightbird": "workspace:*",
    "@lightbird/ui": "workspace:*",
    "next": "15.5.9",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5"
  }
}
```

Note: `"lightbird": "workspace:*"` and `"@lightbird/ui": "workspace:*"` — pnpm resolves these to the local packages during development. Vercel's build handles this correctly.

### `apps/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

The `@/*` alias now only resolves within `apps/web/src/`. It should NOT point to package code — all package imports use `lightbird` or `@lightbird/ui`.

### `apps/web/next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['lightbird', '@lightbird/ui', 'lucide-react'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    if (!isServer) {
      config.output.globalObject = 'self';
    }
    return config;
  },
};

export default nextConfig;
```

Key change: `transpilePackages` now includes `lightbird` and `@lightbird/ui` so Next.js processes workspace packages correctly.

### `apps/web/tailwind.config.ts`

Add workspace and production content paths:

```ts
content: [
  './src/**/*.{ts,tsx}',
  '../../packages/ui/src/**/*.{ts,tsx}',          // dev (workspace)
  './node_modules/@lightbird/ui/dist/**/*.js',     // production
]
```

Everything else (fonts, colors, animations, sidebar variants) stays as-is.

### `apps/web/scripts/copy-ffmpeg-wasm.js`

Updated for pnpm monorepo — checks both local and hoisted `node_modules`:

```js
const { cpSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..'); // apps/web/
const localSrc = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const hoistedSrc = join(root, '..', '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const dest = join(root, 'public', 'ffmpeg');
const src = existsSync(localSrc) ? localSrc : hoistedSrc;

if (!existsSync(src)) {
  console.warn('Warning: @ffmpeg/core not found. MKV playback will use CDN fallback.');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('Copied @ffmpeg/core WASM files to public/ffmpeg/');
```

### Delete old source directories

After all moves are verified:
- Delete `src/lib/` from root
- Delete `src/hooks/` from root
- Delete `src/components/` from root
- Delete `src/types/` from root
- Delete `src/app/` from root
- Delete root `jest.config.ts`, `jest.setup.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`
- Delete root `scripts/`

## Verification

After this phase:
- `apps/web/` contains only the Next.js app shell
- `page.tsx` imports from `@lightbird/ui`
- `layout.tsx` imports `Toaster` from `@lightbird/ui`
- `globals.css` with theme variables stays in the app
- `pnpm dev --filter web` starts on port 9002
- The site looks and works exactly the same
- No old directories remain at root level
- `memory-bank/project-overview.md` updated with new monorepo architecture, file paths, and tech stack changes

## Rollback Safety

Do the entire migration in a single branch. Don't delete old directories until everything is verified working. `git checkout master` restores the flat structure if needed.
