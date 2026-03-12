# Issue 09-06 — Keyboard Shortcut for Video Info Panel

**Plan:** 09 — Video Information Panel
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `plan-09`
**Depends on:** 09-05
**Blocks:** —

---

## Problem

The info panel is only accessible via mouse click. Power users should be able to open it with a keyboard shortcut.

## Goal

Add a `toggle-info` keyboard shortcut (default: `i`) to the shortcut registry and wire it to toggle the info panel.

## Acceptance Criteria

- [ ] `toggle-info` is added to `ShortcutAction` type in `src/lib/keyboard-shortcuts.ts` (if Plan 08 is complete), OR implemented as a standalone `keydown` handler in `lightbird-player.tsx` if Plan 08 is not yet done.
- [ ] Pressing `i` (when no input is focused) toggles the info panel.
- [ ] The shortcut is listed in the help overlay (Plan 08-04) if that plan is implemented.
- [ ] Test: dispatching `i` keydown event toggles `showInfo` state.
- [ ] All existing tests still pass.

## Notes

If Plan 08 is not yet implemented, implement this as a simple `keydown` handler in `lightbird-player.tsx`. When Plan 08 is implemented, migrate to the registry.

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/keyboard-shortcuts.ts` (add toggle-info action, if Plan 08 done) |
| Modify | `src/components/lightbird-player.tsx` (handle `i` key → toggle info) |
