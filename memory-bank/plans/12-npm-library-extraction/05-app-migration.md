# Phase 5 — App Migration (`apps/web/`)

## Goal

Move the existing Next.js app into `apps/web/` and rewire it to import from the `lightbird` and `@lightbird/ui` packages. The app at lightbird.vercel.app continues to work exactly as before.

## What Moves

### Into `apps/web/`

| Source | Destination |
|--------|-------------|
| `src/app/` | `apps/web/src/app/` |
| `public/` | `apps/web/public/` |
| `next.config.ts` | `apps/web/next.config.ts` |
| `tailwind.config.ts` | `apps/web/tailwind.config.ts` |
| `postcss.config.mjs` | `apps/web/postcss.config.mjs` |
| `tsconfig.json` | `apps/web/tsconfig.json` (modified to extend base) |
| `jest.config.ts` | Split — see Phase 7 |
| `jest.setup.ts` | Split — see Phase 7 |
| `scripts/` | `apps/web/scripts/` (copy-ffmpeg-wasm) |
| `.env.example` | `apps/web/.env.example` |

### What stays at root

| File | Why |
|------|-----|
| `.github/` | CI/CD is repo-level |
| `.gitignore` | Repo-level |
| `memory-bank/` | Documentation is repo-level |
| `CLAUDE.md` | Repo-level instructions |
| `LICENSE` | Repo-level |
| `pnpm-workspace.yaml` | Workspace config |
| `turbo.json` | Task runner config |
| `tsconfig.base.json` | Shared TS config |
| Root `package.json` | Workspace root |

## Code Changes Required

### 5.1 App's `package.json`

Create `apps/web/package.json`:

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
    "react-dom": "^18.3.1",
    "tailwindcss": "^3.4.1",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/jest": "^30.0.0",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "jest": "^30.3.0",
    "jest-environment-jsdom": "^30.3.0",
    "postcss": "^8",
    "ts-node": "^10.9.2",
    "typescript": "^5"
  }
}
```

Key: `"lightbird": "workspace:*"` and `"@lightbird/ui": "workspace:*"` — pnpm resolves these to the local packages during development. When deployed, Vercel's build runs `pnpm install` which handles this correctly.

### 5.2 Update `src/app/page.tsx`

The main page currently imports `LightBirdPlayer` from `@/components/lightbird-player`. Change to:

```tsx
"use client"

import LightBirdPlayer from '@lightbird/ui'
// or: import { LightBirdPlayer } from '@lightbird/ui'
```

This makes the app dogfood its own library.

### 5.3 Update `apps/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

The `@/*` path alias now only resolves within `apps/web/src/` — it should NOT point to package code.

### 5.4 Update `apps/web/tailwind.config.ts`

Add `@lightbird/ui` to content paths:

```ts
content: [
  './src/**/*.{ts,tsx}',
  '../../packages/ui/src/**/*.{ts,tsx}',  // for dev (workspace)
  './node_modules/@lightbird/ui/dist/**/*.js',  // for production
]
```

### 5.5 Update `apps/web/next.config.ts`

Add `transpilePackages` so Next.js processes the workspace packages:

```ts
const nextConfig = {
  // ... existing config (COOP/COEP headers, webpack async WASM, etc.)
  transpilePackages: ['lightbird', '@lightbird/ui'],
}
```

### 5.6 What `src/app/` files remain

| File | Status |
|------|--------|
| `src/app/page.tsx` | Updated imports — uses `@lightbird/ui` |
| `src/app/layout.tsx` | Mostly unchanged — may add Toaster from `@lightbird/ui` |
| `src/app/globals.css` | Stays — app-level Tailwind styles |
| `src/app/docs/page.tsx` | NEW — created in Phase 10 |
| `src/app/docs/layout.tsx` | NEW — created in Phase 10 |

### 5.7 Remove old source directories

After all moves are complete and verified:
- Delete `src/lib/` from root (now in `packages/lightbird/src/`)
- Delete `src/hooks/` from root (now in `packages/lightbird/src/react/` and `packages/ui/src/hooks/`)
- Delete `src/components/` from root (now in `packages/ui/src/`)
- Delete `src/types/` from root (now in `packages/lightbird/src/types/`)

These directories should only exist inside the packages after migration.

## Verification

After this phase:
- `apps/web/` contains only the Next.js app shell (`src/app/`, `public/`, config files)
- The app imports everything from `lightbird` and `@lightbird/ui`
- `pnpm dev --filter web` starts the dev server on port 9002
- The site looks and works exactly the same as before
- No `src/lib/`, `src/hooks/`, `src/components/`, or `src/types/` at root level

## Rollback Safety

Do this entire migration in a single branch. If anything breaks, `git checkout main` gets you back to the working flat structure. Don't delete old directories until everything is verified.
