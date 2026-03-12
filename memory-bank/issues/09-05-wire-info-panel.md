# Issue 09-05 — Wire Info Panel into Player + Controls

**Plan:** 09 — Video Information Panel
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `ui`, `plan-09`
**Depends on:** 09-02, 09-03, 09-04
**Blocks:** —

---

## Problem

The `VideoInfoPanel` and `useVideoInfo` hook exist but are not connected to the player UI.

## Goal

Add an Info button to `PlayerControls` and wire everything together in `lightbird-player.tsx`.

## Acceptance Criteria

- [ ] `lightbird-player.tsx` uses `useVideoInfo(videoRef, currentFile)` and has `showInfo: boolean` state.
- [ ] `VideoInfoPanel` is rendered conditionally when `showInfo` is true.
- [ ] `PlayerControls` receives an `onShowInfo` prop.
- [ ] An `Info` icon button (`Info` from `lucide-react`) is added to `PlayerControls` (near the screenshot button or settings button).
  - Tooltip: "Video Information"
  - `aria-label="Video information"`
  - Toggles `showInfo` on click.
- [ ] Pressing Escape while the info panel is open closes it (handled in the panel component or via the player's keydown handler).
- [ ] The info panel button is disabled (or hidden) when no video is loaded.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/components/lightbird-player.tsx` (use hook, render panel, manage state) |
| Modify | `src/components/player-controls.tsx` (add Info button) |
