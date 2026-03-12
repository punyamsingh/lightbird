# Issue 08-03 — Keyboard Shortcut Settings Dialog

**Plan:** 08 — Keyboard Shortcut Customization
**Phase:** 3 (Power Features)
**Labels:** `enhancement`, `ui`, `plan-08`
**Depends on:** 08-01, 08-02
**Blocks:** —

---

## Problem

Users cannot remap keyboard shortcuts. The only way to "change" a shortcut would be to edit source code.

## Goal

Create a Settings dialog where users can view and remap every shortcut by pressing the desired key.

## Acceptance Criteria

- [ ] `src/components/shortcut-settings-dialog.tsx` is created.
- [ ] Dialog shows all shortcuts in a table: action label on the left, current key binding on the right as a `<kbd>` styled button.
- [ ] Clicking a binding button enters "capture mode": the button pulses and shows "Press key...".
- [ ] While in capture mode, the next keydown event (except Escape) sets the new binding.
- [ ] Pressing Escape cancels capture without changing the binding.
- [ ] If the captured key conflicts with an existing binding, a destructive toast is shown and the capture is cancelled.
- [ ] A "Reset to Defaults" button restores all bindings to `DEFAULT_SHORTCUTS`.
- [ ] A "Save" button calls `saveShortcuts(editing)` and updates the parent's shortcut state via `onSave(editing)`.
- [ ] Dialog opened via a `Settings` gear icon button added to `PlayerControls`.
- [ ] Component tests in `src/components/__tests__/shortcut-settings-dialog.test.tsx`:
  - All shortcuts are rendered.
  - Clicking a binding enters capture mode (button text changes).
  - Pressing Escape exits capture mode.
  - Save button calls `onSave`.
  - Reset button restores defaults.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/components/shortcut-settings-dialog.tsx` |
| Create | `src/components/__tests__/shortcut-settings-dialog.test.tsx` |
| Modify | `src/components/player-controls.tsx` (add Settings gear icon button) |
| Modify | `src/components/lightbird-player.tsx` (manage `showSettings` state, pass shortcut update handler) |
