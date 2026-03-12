# Issue HLS-02 — Quality Level Selector UI

**Plan:** hls-dash
**Labels:** `enhancement`, `ui`, `streaming`
**Depends on:** HLS-01
**Blocks:** —

---

## Problem

Multi-rendition HLS streams offer multiple quality levels (e.g. 1080p, 720p, 480p, Auto), but there is no way to select them.

## Goal

Add a quality selector dropdown to the player controls that appears only when an HLS stream with multiple levels is loaded.

## Acceptance Criteria

- [ ] `useHlsQuality` hook is created in `src/hooks/use-hls-quality.ts`:
  - Takes a ref to the current `HLSPlayer | null`.
  - Returns `{ qualityLevels: QualityLevel[], currentLevel: number, setLevel: (idx: number) => void }`.
  - Returns empty array and no-op when player is not an `HLSPlayer`.
  - Listens to `hls.on(Hls.Events.LEVEL_SWITCHED, …)` to keep `currentLevel` in sync.
- [ ] `PlayerControls` receives new props: `qualityLevels: QualityLevel[]`, `currentQualityLevel: number`, `onSetQualityLevel: (idx: number) => void`.
- [ ] When `qualityLevels.length > 1`, a quality selector dropdown is rendered in the controls:
  - Options: "Auto" (index -1) + one option per level showing e.g. "1080p · 8 Mbps".
  - Current selection is highlighted.
  - Selecting an option calls `onSetQualityLevel`.
- [ ] When `qualityLevels.length <= 1`, the dropdown is hidden.
- [ ] Tests in `src/components/__tests__/player-controls.test.tsx`:
  - Quality dropdown hidden when `qualityLevels` is empty.
  - Quality dropdown visible with multiple levels.
  - Selecting a level calls `onSetQualityLevel`.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/hooks/use-hls-quality.ts` |
| Modify | `src/components/player-controls.tsx` (add quality dropdown) |
| Modify | `src/components/lightbird-player.tsx` (use hook, pass props) |
| Modify | `src/components/__tests__/player-controls.test.tsx` |
