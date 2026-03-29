# Phase 11 — npm Publishing

## Goal

Publish `lightbird` and `@lightbird/ui` to npm. Set up README files that drive traffic to the docs page. First publish is manual; automated publishing via GitHub Actions comes later.

## Pre-Publish Checklist

### Before the first publish:

- [ ] npm org `@lightbird` exists (DONE — user created it)
- [ ] npm account has publish access to the org
- [ ] `lightbird` package name is available (check: `npm view lightbird`)
- [ ] All tests pass: `pnpm turbo test`
- [ ] All packages build: `pnpm turbo build`
- [ ] TypeScript declarations exist in `dist/`
- [ ] `package.json` metadata is complete (author, license, homepage, repository, keywords)
- [ ] LICENSE file exists at repo root AND copied into each package's `files` list
- [ ] README.md exists in each package

## README Files

### `packages/lightbird/README.md`

```markdown
# lightbird

Client-side video player engine for the browser. Plays MKV, MP4, WebM, AVI, and more — with full subtitle, audio track, and chapter support. No server required.

**[Documentation](https://lightbird.vercel.app/docs)** | **[Live Demo](https://lightbird.vercel.app)** | **[GitHub](https://github.com/punyamsingh/lightbird)**

## Install

```bash
npm install lightbird
```

## Quick Start

```ts
import { createVideoPlayer } from 'lightbird'

const player = createVideoPlayer(file)
await player.initialize(videoElement)
```

### React Hooks

```tsx
import { useVideoPlayback, useSubtitles } from 'lightbird/react'

const { isPlaying, togglePlay, seek } = useVideoPlayback(videoRef)
```

### Full UI Component

```bash
npm install lightbird @lightbird/ui
```

```tsx
import { LightBirdPlayer } from '@lightbird/ui'

<LightBirdPlayer />
```

## Features

- **MKV playback** — FFmpeg.wasm client-side remuxing
- **Subtitles** — SRT, VTT, ASS/SSA with encoding detection and sync offset
- **Audio tracks** — Multi-track switching for MKV
- **Chapters** — Auto-extraction, seek bar markers, navigation
- **Playlist** — Drag-and-drop, M3U8 import/export
- **More** — PiP, Media Session, keyboard shortcuts, video filters, screenshots

## Documentation

Full API reference, examples, and integration guides at **[lightbird.vercel.app/docs](https://lightbird.vercel.app/docs)**

## License

MIT
```

### `packages/ui/README.md`

```markdown
# @lightbird/ui

Drop-in React video player component powered by [LightBird](https://www.npmjs.com/package/lightbird). Full controls, playlist, subtitles, chapters — one import.

**[Documentation](https://lightbird.vercel.app/docs)** | **[Live Demo](https://lightbird.vercel.app)** | **[GitHub](https://github.com/punyamsingh/lightbird)**

## Install

```bash
npm install lightbird @lightbird/ui
```

## Usage

```tsx
"use client"

import { LightBirdPlayer } from '@lightbird/ui'

export default function VideoPage() {
  return <LightBirdPlayer />
}
```

### Tailwind CSS Setup

Add to your `tailwind.config.ts`:

```ts
content: [
  // ...your paths
  './node_modules/@lightbird/ui/dist/**/*.js',
]
```

Or use the pre-compiled stylesheet:

```tsx
import '@lightbird/ui/styles.css'
```

## Exported Components

- `<LightBirdPlayer />` — Full player (drop-in)
- `<PlayerControls />` — Standalone control bar
- `<PlaylistPanel />` — Standalone playlist sidebar
- `<Toaster />` — Toast notification provider

## Requires

- `lightbird` (peer dependency)
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0

## Documentation

Full API reference at **[lightbird.vercel.app/docs](https://lightbird.vercel.app/docs)**

## License

MIT
```

## First Manual Publish

### Step 1: Login to npm

```bash
npm login
# or: pnpm login
```

### Step 2: Build everything

```bash
pnpm turbo build
```

### Step 3: Verify package contents

```bash
cd packages/lightbird && pnpm pack --dry-run
cd packages/ui && pnpm pack --dry-run
```

This shows exactly what files will be included in the published package. Verify:
- `dist/` is included
- `README.md` is included
- `LICENSE` is included
- No `src/`, `__tests__/`, `node_modules/`, or config files leak through
- The `files` field in `package.json` controls this

### Step 4: Publish core first

```bash
cd packages/lightbird
pnpm publish --access public
```

Core must be published first because `@lightbird/ui` depends on it.

### Step 5: Publish UI

```bash
cd packages/ui
pnpm publish --access public
```

### Step 6: Verify on npm

- Visit `https://www.npmjs.com/package/lightbird`
- Visit `https://www.npmjs.com/package/@lightbird/ui`
- Verify README renders correctly
- Verify homepage link points to `https://lightbird.vercel.app/docs`
- Test install in a fresh project:
  ```bash
  mkdir /tmp/test-lightbird && cd /tmp/test-lightbird
  npm init -y
  npm install lightbird
  node -e "const lb = require('lightbird'); console.log(Object.keys(lb))"
  ```

## Versioning Strategy

Use **semantic versioning**:
- `0.1.x` — patches (bug fixes, no API changes)
- `0.x.0` — minor (new features, backwards compatible)
- `x.0.0` — major (breaking changes)

Both packages should be versioned together (same version number) for simplicity. When you bump `lightbird` to `0.2.0`, also bump `@lightbird/ui` to `0.2.0`.

## Post-Publish

1. Update `memory-bank/project-overview.md` with npm package links
2. Add npm badge to repo README
3. Consider setting up the automated publish workflow (see `08-ci-cd.md`)
4. Announce on social media / relevant communities

## Verification

After this phase:
- `npm install lightbird` works globally
- `npm install @lightbird/ui` works globally
- npm pages show correct README, homepage link, keywords
- A fresh project can import and use both packages
- `lightbird.vercel.app/docs` "Try it out" and install instructions match reality
