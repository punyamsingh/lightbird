# Issue 08-02 — Refactor useKeyboardShortcuts Hook

**Plan:** 08 — Keyboard Shortcut Customization
**Phase:** 3 (Power Features)
**Labels:** `refactor`, `plan-08`
**Depends on:** 08-01
**Blocks:** 08-03

---

## Problem

`useKeyboardShortcuts` currently takes hardcoded key handlers. It needs to be driven by the shortcut registry from 08-01.

## Goal

Rewrite the hook to accept a `ShortcutBinding[]` and a `Record<ShortcutAction, () => void>` handler map, and use `matchesShortcut` + `isInteractiveElement` for dispatch.

## Acceptance Criteria

- [ ] `useKeyboardShortcuts` signature is updated to:
  ```ts
  function useKeyboardShortcuts(
    shortcuts: ShortcutBinding[],
    handlers: Partial<Record<ShortcutAction, () => void>>
  ): void
  ```
- [ ] The hook uses `isInteractiveElement(document.activeElement)` to guard against firing in inputs.
- [ ] The hook iterates `shortcuts`, calls `matchesShortcut`, and dispatches the first match. Prevents default on match.
- [ ] The hook re-registers the event listener when `shortcuts` or `handlers` changes (correct deps array).
- [ ] `lightbird-player.tsx` is updated to:
  - Load shortcuts on mount: `useState(() => loadShortcuts())`.
  - Build a `shortcutHandlers` object with `useMemo`.
  - Pass both to `useKeyboardShortcuts`.
- [ ] Tests in `src/hooks/__tests__/use-keyboard-shortcuts.test.ts` are updated to use the new API:
  - Correct handler called on matching key event.
  - No handler called when focus is in an input.
  - No handler called when wrong modifier is held.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/hooks/use-keyboard-shortcuts.ts` |
| Modify | `src/hooks/__tests__/use-keyboard-shortcuts.test.ts` |
| Modify | `src/components/lightbird-player.tsx` (load shortcuts, build handlers) |
