# Issue 08-01 — Keyboard Shortcut Registry

**Plan:** 08 — Keyboard Shortcut Customization
**Phase:** 3 (Power Features)
**Labels:** `enhancement`, `plan-08`
**Depends on:** —
**Blocks:** 08-02, 08-03, 08-04

---

## Problem

Keyboard shortcuts are magic strings scattered in a `keydown` handler. There is no central registry of what shortcuts exist, no standard format for a "binding", and no persistence.

## Goal

Create a self-contained, well-typed shortcut registry with load/save to `localStorage`.

## Acceptance Criteria

- [ ] `src/lib/keyboard-shortcuts.ts` is created with:
  - `ShortcutAction` union type (13 actions: play-pause, seek ±5s, seek ±30s, volume up/down, mute, fullscreen, next-item, prev-item, screenshot, show-shortcuts).
  - `ShortcutBinding` interface: `{ action, label, defaultKey, key, modifiers? }`.
  - `DEFAULT_SHORTCUTS: ShortcutBinding[]` array.
  - `loadShortcuts(): ShortcutBinding[]` — reads overrides from `localStorage` key `lightbird-shortcuts`, merges with defaults.
  - `saveShortcuts(bindings: ShortcutBinding[]): void` — saves only non-default bindings to save space.
  - `matchesShortcut(e: KeyboardEvent, binding: ShortcutBinding): boolean` — checks key + modifiers, both ways (no spurious modifier matches).
  - `isInteractiveElement(el: EventTarget | null): boolean` — true for input, textarea, select, button, a, and contentEditable elements.
- [ ] Unit tests in `src/lib/__tests__/keyboard-shortcuts.test.ts`:
  - `loadShortcuts` returns defaults when localStorage is empty.
  - `loadShortcuts` merges saved overrides onto defaults.
  - `loadShortcuts` handles corrupt localStorage gracefully.
  - `matchesShortcut` returns true for exact match.
  - `matchesShortcut` returns false when wrong modifier is held.
  - `matchesShortcut` returns false when extra modifier is held.
  - `isInteractiveElement` returns true for input element, false for div.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/keyboard-shortcuts.ts` |
| Create | `src/lib/__tests__/keyboard-shortcuts.test.ts` |
