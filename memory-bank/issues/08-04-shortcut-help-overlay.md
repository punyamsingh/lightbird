# Issue 08-04 — Keyboard Shortcut Help Overlay (? key)

**Plan:** 08 — Keyboard Shortcut Customization
**Phase:** 3 (Power Features)
**Labels:** `enhancement`, `ui`, `plan-08`
**Depends on:** 08-02
**Blocks:** —

---

## Problem

Users have no way to discover what keyboard shortcuts exist without reading documentation or source code.

## Goal

Pressing `?` shows a read-only overlay listing all current keyboard bindings. Pressing `?` or Escape closes it.

## Acceptance Criteria

- [ ] A `show-shortcuts` action is included in the shortcut registry (08-01) with default key `?`.
- [ ] `lightbird-player.tsx` has `showShortcutsHelp: boolean` state.
- [ ] The `show-shortcuts` handler sets `showShortcutsHelp` to `true`.
- [ ] The overlay renders as `position: absolute, inset-0, z-50, bg-black/90` centered.
- [ ] The overlay lists all shortcuts in two columns (label + `<kbd>` tag).
- [ ] Pressing `?` or Escape (handled via `keydown` on the overlay div) closes it.
- [ ] The overlay is also closeable by clicking the backdrop.
- [ ] Component tests in `src/components/__tests__/lightbird-player.test.tsx` or a standalone test:
  - Overlay is not visible initially.
  - Dispatching `?` keydown makes overlay visible.
  - Dispatching Escape keydown closes overlay.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/components/lightbird-player.tsx` (add showShortcutsHelp state + overlay JSX) |
