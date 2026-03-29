# Phase 9 — Dependency Cleanup

## Goal

Remove unused dependencies and ensure each package only declares the dependencies it actually uses. This reduces install size for library consumers and eliminates phantom deps.

## Current State

The current `package.json` has ~45 dependencies. Many are unused leftovers from the initial ShadCN scaffold or removed features (Firebase, Genkit, etc. were already removed in Plan 10, but several ShadCN-related deps remain).

## Audit: What Goes Where

### Dependencies that go to `packages/lightbird/`

| Package | Type | Notes |
|---------|------|-------|
| `ass-compiler` | dependency | ASS/SSA subtitle parsing |
| `chardet` | dependency | Encoding detection |
| `@ffmpeg/ffmpeg` | optionalDependency | MKV remuxing |
| `@ffmpeg/core` | optionalDependency | FFmpeg WASM core |
| `@ffmpeg/util` | optionalDependency | FFmpeg utilities |

### Dependencies that go to `packages/ui/`

| Package | Type | Notes |
|---------|------|-------|
| `@dnd-kit/core` | dependency | Drag-and-drop |
| `@dnd-kit/sortable` | dependency | Sortable lists |
| `@dnd-kit/utilities` | dependency | DnD utilities |
| `@radix-ui/react-dialog` | dependency | ShortcutSettingsDialog |
| `@radix-ui/react-popover` | dependency | Chapter menu, audio track selector |
| `@radix-ui/react-progress` | dependency | VideoOverlay progress bar |
| `@radix-ui/react-scroll-area` | dependency | PlaylistPanel scroll |
| `@radix-ui/react-select` | dependency | Speed selector, audio track |
| `@radix-ui/react-separator` | dependency | Visual separators |
| `@radix-ui/react-slider` | dependency | Volume, seek bar, subtitle offset |
| `@radix-ui/react-slot` | dependency | Button component (Slot pattern) |
| `@radix-ui/react-toast` | dependency | Toast notifications |
| `@radix-ui/react-tooltip` | dependency | Button tooltips |
| `@tanstack/react-virtual` | dependency | Playlist virtualization |
| `class-variance-authority` | dependency | ShadCN component variants |
| `clsx` | dependency | Class merging |
| `lucide-react` | dependency | Icons |
| `tailwind-merge` | dependency | Tailwind class dedup |
| `tailwindcss-animate` | devDependency | Animation plugin |

### Dependencies that go to `apps/web/`

| Package | Type | Notes |
|---------|------|-------|
| `next` | dependency | Framework |
| `react` | dependency | UI library |
| `react-dom` | dependency | React DOM renderer |
| `tailwindcss` | devDependency | Styling |
| `postcss` | devDependency | CSS processing |
| `typescript` | devDependency | Type checking |

### Dependencies to REMOVE (unused)

| Package | Why unused |
|---------|-----------|
| `date-fns` | Not imported anywhere in the codebase |
| `dotenv` | Not imported anywhere |
| `embla-carousel-react` | Not imported anywhere |
| `react-day-picker` | Not imported anywhere |
| `react-hook-form` | Not imported anywhere |
| `@hookform/resolvers` | Not imported anywhere (depends on react-hook-form) |
| `zod` | Not imported anywhere |

### ShadCN UI components to VERIFY and likely REMOVE

Before deleting, grep for actual usage in player components:

| Package | Check import pattern | Likely verdict |
|---------|---------------------|---------------|
| `@radix-ui/react-accordion` | `from.*accordion` | REMOVE — not used by player |
| `@radix-ui/react-alert-dialog` | `from.*alert-dialog` | REMOVE — not used by player |
| `@radix-ui/react-avatar` | `from.*avatar` | REMOVE — not used by player |
| `@radix-ui/react-checkbox` | `from.*checkbox` | CHECK — maybe shortcut settings? |
| `@radix-ui/react-collapsible` | `from.*collapsible` | CHECK — maybe playlist? |
| `@radix-ui/react-dropdown-menu` | `from.*dropdown-menu` | REMOVE — not used by player |
| `@radix-ui/react-label` | `from.*label` | CHECK — maybe shortcut settings? |
| `@radix-ui/react-menubar` | `from.*menubar` | REMOVE — not used by player |
| `@radix-ui/react-radio-group` | `from.*radio-group` | REMOVE — not used by player |
| `@radix-ui/react-switch` | `from.*switch` | CHECK — maybe settings? |
| `@radix-ui/react-tabs` | `from.*tabs` | REMOVE — not used by player |

### ShadCN UI component files to REMOVE from `src/components/ui/`

Any `.tsx` file in `src/components/ui/` that isn't imported by a player component should be deleted (not moved to `packages/ui/`). Carry over only what's needed.

## Execution Steps

### 9.1 Grep for unused deps

```bash
# For each suspect dependency, search the entire codebase
grep -r "date-fns" src/        # should return nothing
grep -r "embla-carousel" src/  # should return nothing
grep -r "react-day-picker" src/ # should return nothing
grep -r "react-hook-form" src/ # should return nothing
grep -r "zod" src/             # should return nothing
grep -r "dotenv" src/          # should return nothing
```

### 9.2 Grep for ShadCN component usage

```bash
# For each Radix component, check if it's imported by a player component
grep -r "accordion" src/components/lightbird-player.tsx src/components/player-controls.tsx src/components/playlist-panel.tsx
# Repeat for each suspect package
```

### 9.3 Remove unused deps

After confirming they're unused, remove from the root `package.json` (before the monorepo migration) or from the relevant package (after migration).

### 9.4 Delete unused ShadCN component files

Any file in `src/components/ui/` that is only imported by other unused ShadCN files (not by player components) gets deleted.

## Expected Size Reduction

Removing the 7 confirmed unused packages eliminates:
- `date-fns`: ~72 kB gzip
- `react-hook-form` + `@hookform/resolvers` + `zod`: ~45 kB gzip
- `embla-carousel-react` + `react-day-picker`: ~30 kB gzip
- `dotenv`: ~5 kB gzip

**Total: ~150 kB reduction** from the app bundle, and none of these ever get into the library packages.

## Verification

After this phase:
- No unused dependencies in any `package.json`
- Each package only declares its own dependencies
- `pnpm install` has no peer dep warnings (except intentional optionals)
- `pnpm turbo build` succeeds
- `pnpm turbo test` passes
- No unused `src/components/ui/*.tsx` files remain
