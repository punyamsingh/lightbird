# Phase 12 — Cross-Cutting Concerns

## Goal

Address issues that span multiple phases and don't fit neatly into one plan file.

## 12.1 Update `CLAUDE.md`

After the monorepo migration, all file paths in `CLAUDE.md` become invalid. Update the **Key source files** section:

```markdown
**Key source files:**
- `packages/lightbird/src/video-processor.ts` — player factory + VideoPlayer interface
- `packages/lightbird/src/players/simple-player.ts` — HTML5 player wrapper
- `packages/lightbird/src/players/mkv-player.ts` — MKV player (FFmpeg.wasm)
- `packages/lightbird/src/subtitles/subtitle-converter.ts` — SRT → VTT conversion
- `packages/lightbird/src/subtitles/subtitle-manager.ts` — subtitle track management
- `packages/lightbird/src/react/` — React hooks (11 files)
- `packages/ui/src/lightbird-player.tsx` — main player component
- `packages/ui/src/player-controls.tsx` — playback controls UI
- `packages/ui/src/playlist-panel.tsx` — playlist management UI
- `apps/web/src/app/` — Next.js app (lightbird.vercel.app)
- `apps/web/src/app/docs/` — documentation page
```

Also update:
- **Common Commands** section — add `pnpm` equivalents and `turbo` commands
- **Running the tests** section — update to `pnpm turbo test`
- **Test infrastructure** section — note the split jest configs

## 12.2 Update `memory-bank/project-overview.md`

After all phases complete:
- Add Plan 12 to the roadmap table as **DONE**
- Update the **Architecture** section to reflect monorepo structure
- Update the **Tech Stack** table to include pnpm, Turborepo, tsup
- Add npm package links
- Update file paths throughout

## 12.3 CSS Custom Properties (Theme Variables)

The LightBird theme uses CSS custom properties defined in `globals.css`:

```css
:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --popover: 222.2 84% 4.9%;
  --primary: 210 40% 98%;
  --secondary: 217.2 32.6% 17.5%;
  --muted: 217.2 32.6% 17.5%;
  --accent: 217.2 32.6% 17.5%;
  --destructive: 0 62.8% 30.6%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
  --radius: 0.5rem;
  /* (each with -foreground variants) */
}
```

**Where these live after migration:**
- `apps/web/src/app/globals.css` — the app's theme (unchanged)
- `packages/ui/src/styles/input.css` — pre-compiled CSS includes default values for these variables
- Users who use the Tailwind content config approach define their own variables
- Users who import `@lightbird/ui/styles.css` get the default dark theme

**The key insight:** ShadCN/Tailwind components use `bg-background`, `text-foreground`, `border-border`, etc. These resolve to `hsl(var(--background))` etc. The variables MUST be defined somewhere in the consuming app's CSS. The pre-compiled CSS provides defaults; the Tailwind content approach requires the user to define them.

**Document this in the /docs page:** Show users they need to define these CSS variables OR import the pre-compiled CSS.

## 12.4 The `Toaster` / `useToast` / `toast.tsx` Chain

This is a dependency chain that spans packages:

```
@lightbird/ui
├── primitives/toaster.tsx    → renders toast notifications
├── primitives/toast.tsx      → Radix Toast wrapper + types
├── hooks/use-toast.ts        → state management, imports types from toast.tsx
└── shortcut-settings-dialog.tsx  → imports useToast
└── lightbird-player.tsx          → imports useToast, passes onError to useSubtitles
```

All of this stays inside `@lightbird/ui`. The chain is self-contained.

The ONLY cross-package concern was `use-subtitles.ts` (in `lightbird/react`) importing `useToast`. This is resolved in Phase 3 by replacing the toast call with an `onError` callback.

## 12.5 `useVirtualizer` Import

`playlist-panel.tsx` uses `@tanstack/react-virtual` which imports:
```ts
import { useVirtualizer } from '@tanstack/react-virtual';
```

This stays as an external dependency of `@lightbird/ui`. No cross-package concern.

## 12.6 Google Fonts

The app loads Orbitron and Roboto via Google Fonts in `layout.tsx`. The `@lightbird/ui` components use these via Tailwind classes (`font-headline`, `font-body`).

**For library consumers:**
- If they use Tailwind content config: they need to define `fontFamily.headline` and `fontFamily.body` in their Tailwind config, or the classes will be no-ops (text renders in default font — acceptable fallback).
- If they use pre-compiled CSS: the compiled CSS will include the `font-headline` and `font-body` classes but won't load the fonts. Users need to load fonts themselves or accept default fonts.

**Document this in /docs** as optional customization.

## 12.7 `copy-ffmpeg-wasm.js` in Monorepo

The script copies `@ffmpeg/core` WASM files from `node_modules` to `public/ffmpeg/`. In the monorepo with pnpm:

- pnpm hoists packages to the workspace root `node_modules/`
- `apps/web/node_modules/@ffmpeg/core` may not exist (it's in root `node_modules/`)
- The script needs to search both locations:

```js
const { cpSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
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

## 12.8 `.gitignore` Updates

Add to existing `.gitignore`:
```
# Turborepo
.turbo

# Package build outputs
packages/*/dist

# pnpm
node_modules
```

## 12.9 `.env.example` Update

The current `.env.example` references Firebase (already removed). After migration, move to `apps/web/.env.example` and clean it up:

```
# No environment variables required for basic operation.
# FFmpeg WASM is loaded from CDN by default.
# To self-host, copy @ffmpeg/core WASM files to public/ffmpeg/.
```

## 12.10 LICENSE File

Create a `LICENSE` file at the repo root with MIT license text. Copy it into both packages' directories (or reference it in the `files` field). The `pnpm publish` step needs it present next to `package.json`.

## Verification

After addressing all cross-cutting concerns:
- `CLAUDE.md` file paths are correct
- `memory-bank/project-overview.md` is up to date
- CSS custom properties documented for library consumers
- `copy-ffmpeg-wasm.js` works with pnpm hoisting
- `.gitignore` covers turbo and package dist directories
- MIT LICENSE file exists
