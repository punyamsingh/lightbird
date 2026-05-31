# Issue HLS-02 — Quality Level Selector UI  [DONE]

> **Implemented** (closes GitHub issue #50). Monorepo-correct paths were used (the spec below predates the monorepo):
> - `useHlsQuality` hook → `packages/lightbird/src/react/use-hls-quality.ts` (exported from `react/index.ts`). Takes a `RefObject<VideoPlayer | null>`; returns `{ qualityLevels, currentLevel, setLevel }`; empty list + no-op unless the ref holds an `HLSPlayer`; stays in sync with `LEVEL_SWITCHED` via `HLSPlayer.onMetadataChange`.
> - `HLSPlayer.getCurrentLevel()` getter added so the hook can report the active level.
> - `PlayerControls` (`packages/ui/src/player-controls.tsx`) gained optional `qualityLevels` / `currentQualityLevel` / `onSetQualityLevel` props and renders an Auto + per-rendition picker (Popover + RadioGroup, matching the audio/speed pickers) when 2+ levels exist; hidden otherwise.
> - `LightBirdPlayer` wires `useHlsQuality(playerRef)` through to the controls.
> - Tests: `packages/ui/__tests__/player-controls.test.tsx` + `packages/lightbird/__tests__/react/use-hls-quality.test.ts`. `pnpm test` and `pnpm typecheck` green.

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

- [x] `useHlsQuality` hook is created (monorepo: `packages/lightbird/src/react/use-hls-quality.ts`):
  - Takes a ref to the current `HLSPlayer | null`.
  - Returns `{ qualityLevels: QualityLevel[], currentLevel: number, setLevel: (idx: number) => void }`.
  - Returns empty array and no-op when player is not an `HLSPlayer`.
  - Stays in sync with `LEVEL_SWITCHED` (via `HLSPlayer.onMetadataChange`).
- [x] `PlayerControls` receives new props: `qualityLevels: QualityLevel[]`, `currentQualityLevel: number`, `onSetQualityLevel: (idx: number) => void`.
- [x] When `qualityLevels.length > 1`, a quality selector is rendered in the controls:
  - Options: "Auto" (index -1) + one option per level showing e.g. "1080p · 8 Mbps".
  - Current selection is highlighted.
  - Selecting an option calls `onSetQualityLevel`.
- [x] When `qualityLevels.length <= 1`, the selector is hidden.
- [x] Tests (monorepo: `packages/ui/__tests__/player-controls.test.tsx`):
  - Quality selector hidden when `qualityLevels` is empty.
  - Quality selector visible with multiple levels.
  - Selecting a level calls `onSetQualityLevel`.
- [x] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/hooks/use-hls-quality.ts` |
| Modify | `src/components/player-controls.tsx` (add quality dropdown) |
| Modify | `src/components/lightbird-player.tsx` (use hook, pass props) |
| Modify | `src/components/__tests__/player-controls.test.tsx` |
