# Phase 9 — Dependency Cleanup

## Goal

Remove unused dependencies. Ensure each package declares only its own deps. Reduce install size for library consumers.

## Definitive Audit: Unused Dependencies to REMOVE

These are confirmed unused by grepping the entire `src/` directory:

| Package | Why it's unused |
|---------|----------------|
| `date-fns` | Not imported anywhere |
| `dotenv` | Not imported anywhere |
| `embla-carousel-react` | Not imported anywhere |
| `react-day-picker` | Not imported anywhere |
| `react-hook-form` | Not imported anywhere |
| `@hookform/resolvers` | Not imported anywhere (depends on react-hook-form) |
| `zod` | Not imported anywhere |

## Definitive Audit: ShadCN UI Components to DELETE

Confirmed by auditing all 9 player component import statements:

| File | Verdict | Evidence |
|------|---------|----------|
| `ui/alert.tsx` | **DELETE** | Not imported by any player component |
| `ui/badge.tsx` | **DELETE** | Not imported by any player component |
| `ui/card.tsx` | **DELETE** | Not imported by any player component |
| `ui/checkbox.tsx` | **DELETE** | Not imported by any player component |
| `ui/collapsible.tsx` | **DELETE** | Not imported by any player component |
| `ui/form.tsx` | **DELETE** | Not imported by any player component |
| `ui/progress.tsx` | **DELETE** | Not imported by any player component |
| `ui/separator.tsx` | **DELETE** | Not imported by any player component |
| `ui/sheet.tsx` | **DELETE** | Not imported by any player component |
| `ui/sidebar.tsx` | **DELETE** | Not imported by any player component |
| `ui/skeleton.tsx` | **DELETE** | Not imported by any player component |
| `ui/switch.tsx` | **DELETE** | Not imported by any player component |
| `ui/table.tsx` | **DELETE** | Not imported by any player component |
| `ui/textarea.tsx` | **DELETE** | Not imported by any player component |

## Definitive Audit: ShadCN UI Components to KEEP

| File | Used by |
|------|---------|
| `ui/button.tsx` | player-controls, playlist-panel, player-error-display, shortcut-settings-dialog |
| `ui/slider.tsx` | player-controls |
| `ui/popover.tsx` | player-controls |
| `ui/tooltip.tsx` | player-controls, playlist-panel |
| `ui/label.tsx` | player-controls |
| `ui/radio-group.tsx` | player-controls |
| `ui/scroll-area.tsx` | playlist-panel |
| `ui/input.tsx` | playlist-panel |
| `ui/select.tsx` | playlist-panel |
| `ui/dialog.tsx` | shortcut-settings-dialog |
| `ui/toast.tsx` | use-toast.ts, toaster.tsx |
| `ui/toaster.tsx` | layout.tsx |

## Radix Dependencies to REMOVE from `@lightbird/ui`

These Radix packages correspond to deleted ShadCN components:

| Package | Why |
|---------|-----|
| `@radix-ui/react-accordion` | No accordion component used |
| `@radix-ui/react-alert-dialog` | No alert dialog used |
| `@radix-ui/react-avatar` | No avatar used |
| `@radix-ui/react-checkbox` | No checkbox used |
| `@radix-ui/react-collapsible` | No collapsible used |
| `@radix-ui/react-dropdown-menu` | No dropdown menu used |
| `@radix-ui/react-menubar` | No menubar used |
| `@radix-ui/react-progress` | No progress bar used |
| `@radix-ui/react-separator` | No separator used |
| `@radix-ui/react-switch` | No switch used |
| `@radix-ui/react-tabs` | No tabs used |

## Radix Dependencies to KEEP in `@lightbird/ui`

| Package | Used by |
|---------|---------|
| `@radix-ui/react-dialog` | shortcut-settings-dialog |
| `@radix-ui/react-label` | player-controls |
| `@radix-ui/react-popover` | player-controls |
| `@radix-ui/react-radio-group` | player-controls |
| `@radix-ui/react-scroll-area` | playlist-panel |
| `@radix-ui/react-select` | playlist-panel |
| `@radix-ui/react-slider` | player-controls |
| `@radix-ui/react-slot` | button component (Slot pattern) |
| `@radix-ui/react-toast` | toast/toaster |
| `@radix-ui/react-tooltip` | player-controls, playlist-panel |

## Execution Order

1. Delete 14 unused ShadCN component files from `src/components/ui/`
2. Remove 7 unused npm packages from `package.json`
3. Remove 11 unused Radix packages from `package.json`
4. Run `pnpm install` to update lockfile
5. Run `pnpm turbo test` to verify nothing breaks
6. Run `pnpm turbo build` to verify build succeeds

## Expected Savings

- 7 unused packages: ~150 kB gzip removed from app bundle
- 11 unused Radix packages: ~80 kB gzip removed from `@lightbird/ui` install
- 14 deleted component files: cleaner codebase, faster IDE indexing

## Verification

- No unused dependencies in any `package.json`
- Each package only declares its own dependencies
- `pnpm install` has no peer dep warnings (except intentional optionals)
- `pnpm turbo build` succeeds
- `pnpm turbo test` passes
- No unused component files remain
