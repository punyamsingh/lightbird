# Plan 12 — npm Library Extraction

## Status: PENDING

## Goal

Transform LightBird from a Next.js application into a **monorepo** that publishes two npm packages while keeping the existing web app (lightbird.vercel.app) fully functional. Add a `/docs` route to the web app that serves as the library documentation.

## Packages

| Package | npm name | What it is |
|---------|----------|------------|
| Core | `lightbird` | Framework-agnostic engine: players, parsers, subtitle pipeline, utilities, types |
| Core React subpath | `lightbird/react` | React hooks (headless, no UI deps) — same npm install, different entry point |
| UI | `@lightbird/ui` | Drop-in styled React components (Tailwind + Radix + Lucide) |

## User-Facing Install Paths

```bash
# Full drop-in (React + styled UI)
npm install lightbird @lightbird/ui

# Headless React (bring your own UI)
npm install lightbird

# Any framework (vanilla JS, Vue, Svelte, etc.)
npm install lightbird
```

## Usage Examples

```tsx
// 1. Full drop-in
import { LightBirdPlayer } from '@lightbird/ui'
<LightBirdPlayer />

// 2. Headless React hooks
import { useVideoPlayback, useSubtitles } from 'lightbird/react'

// 3. Framework-agnostic
import { createVideoPlayer } from 'lightbird'
const player = createVideoPlayer(file)
await player.initialize(videoElement)
```

## Key Decisions

1. **Monorepo tool:** pnpm workspaces + Turborepo
2. **Bundler for packages:** tsup (ESM + CJS output)
3. **npm org:** `@lightbird` (created)
4. **License:** MIT
5. **Starting version:** 0.1.0
6. **CSS strategy:** Both pre-compiled CSS file AND Tailwind content config (user chooses)
7. **FFmpeg:** `optionalDependencies` — not required if user only needs HTML5 playback
8. **React:** Optional peer dep — only needed if importing from `lightbird/react`

## Phases

| Phase | File | Description |
|-------|------|-------------|
| 1 | `01-monorepo-setup.md` | Initialize pnpm + Turborepo monorepo structure |
| 2 | `02-core-package.md` | Extract `lightbird` package from `src/lib/` + `src/types/` |
| 3 | `03-react-hooks-subpath.md` | Move hooks into `lightbird/react` subpath |
| 4 | `04-ui-package.md` | Extract `@lightbird/ui` from `src/components/` |
| 5 | `05-app-migration.md` | Move Next.js app to `apps/web/`, rewire imports |
| 6 | `06-build-config.md` | tsup config, TypeScript config, exports map |
| 7 | `07-testing-strategy.md` | Migrate tests, per-package jest configs, turbo test |
| 8 | `08-ci-cd.md` | Update GitHub Actions, Vercel deployment, npm publish |
| 9 | `09-dependency-cleanup.md` | Remove unused deps, audit what goes where |
| 10 | `10-docs-page.md` | Build `/docs` route with installation, API reference, examples |
| 11 | `11-npm-publishing.md` | README content, package.json metadata, publish checklist |

## Execution Order

Steps 1-5 are the structural migration (must be sequential).
Steps 6-7 make everything build and test again.
Step 8 restores CI/CD.
Step 9 is cleanup.
Steps 10-11 are the public-facing deliverables.

Total estimated effort: 2-3 focused sessions.
