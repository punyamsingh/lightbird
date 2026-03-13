# Issue PIP-02 — PiP Button in PlayerControls

**Plan:** picture-in-picture
**Labels:** `enhancement`, `ui`
**Depends on:** PIP-01
**Blocks:** —

---

## Problem

The `usePictureInPicture` hook exists but is not connected to the UI.

## Goal

Add a PiP toggle button to `PlayerControls` and wire it to the hook in `lightbird-player.tsx`.

## Acceptance Criteria

- [x] `PlayerControls` receives two new props: `onTogglePiP: () => void` and `isPiP: boolean` and `pipSupported: boolean`.
- [ ] When `pipSupported` is `false`, the button is not rendered.
- [ ] When `pipSupported` is `true`:
  - A `PictureInPicture2` icon (lucide-react) button is rendered near the fullscreen button.
  - `aria-label` is `"Enter picture-in-picture"` when not in PiP, `"Exit picture-in-picture"` when in PiP.
  - Button has a tooltip matching the aria-label.
  - Clicking the button calls `onTogglePiP`.
  - When `isPiP` is `true`, the button icon or border is visually active (e.g. `text-primary`).
- [ ] `lightbird-player.tsx` uses `usePictureInPicture(videoRef)` and passes the results to `PlayerControls`.
- [ ] Tests in `src/components/__tests__/player-controls.test.tsx`:
  - Button hidden when `pipSupported={false}`.
  - Button visible when `pipSupported={true}`.
  - Clicking button calls `onTogglePiP`.
  - Button label reflects `isPiP` state.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/components/player-controls.tsx` (add PiP button) |
| Modify | `src/components/lightbird-player.tsx` (use hook, pass props) |
| Modify | `src/components/__tests__/player-controls.test.tsx` (add PiP tests) |
