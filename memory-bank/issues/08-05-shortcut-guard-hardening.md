# Issue 08-05 — Shortcut Guard Hardening

**Plan:** 08 — Keyboard Shortcut Customization
**Phase:** 3 (Power Features)
**Labels:** `bug`, `plan-08`
**Depends on:** 08-02
**Blocks:** —

---

## Problem

The current shortcut guard only checks for `<input>` tags. If a `<textarea>`, `<select>`, or `contentEditable` element is added in the future, shortcuts could fire unexpectedly inside them.

This is a correctness issue that must be addressed as part of the shortcut refactor.

## Acceptance Criteria

- [ ] `isInteractiveElement` in `src/lib/keyboard-shortcuts.ts` guards against: `input`, `textarea`, `select`, `button`, `a`, and `el.isContentEditable`.
- [ ] The `useKeyboardShortcuts` hook uses `isInteractiveElement(document.activeElement)` as the guard.
- [ ] Tests verify:
  - Shortcut does NOT fire when a `<textarea>` is focused.
  - Shortcut does NOT fire when a `contentEditable` div is focused.
  - Shortcut DOES fire when a plain `<div>` is focused.
- [ ] All existing tests still pass.

## Notes

This is a small change but has outsize importance for correctness. If future features add input fields (subtitle search, stream URL input, etc.), shortcuts must not interfere with typing in those fields.

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/keyboard-shortcuts.ts` (isInteractiveElement guard) |
| Modify | `src/lib/__tests__/keyboard-shortcuts.test.ts` (add guard tests) |
