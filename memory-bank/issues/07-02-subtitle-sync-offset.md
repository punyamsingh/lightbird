# Issue 07-02 — Subtitle Sync Offset / Delay Adjustment

**Plan:** 07 — Advanced Subtitle Support
**Phase:** 3 (Power Features)
**Labels:** `enhancement`, `subtitles`, `ui`, `plan-07`
**Depends on:** —
**Blocks:** —

---

## Problem

When subtitle timing is off (common with ripped files), users cannot adjust the sync without downloading a re-encoded file or using external software.

## Goal

Add a sync offset slider (±30 seconds) that shifts all subtitle cue timestamps in real time.

## Acceptance Criteria

- [ ] `src/lib/subtitle-offset.ts` is created with:
  - `applyOffsetToVtt(vttText: string, offsetSeconds: number): string` — shifts all `HH:MM:SS.mmm --> HH:MM:SS.mmm` timestamps.
  - `shiftTimestamp(ts: string, delta: number): string` — shifts a single timestamp, clamped to ≥ 0.
- [ ] Unit tests in `src/lib/__tests__/subtitle-offset.test.ts`:
  - Positive offset moves timestamps forward.
  - Negative offset moves timestamps backward.
  - Timestamps are clamped to 0 (never go negative).
  - Offset of 0 returns identical VTT.
- [ ] `useSubtitles` hook (or `lightbird-player.tsx`) tracks `subtitleOffset: number` state (default 0).
- [ ] When `subtitleOffset` changes, the active subtitle's VTT blob URL is regenerated with the offset applied, and the `<track>` element's `src` is updated.
- [ ] A sync offset control is added to the subtitle section of `PlayerControls`:
  - A `Slider` component with `min={-30}`, `max={30}`, `step={0.5}`.
  - A text label showing the current offset (e.g. "+2.5s", "-1.0s", "0s").
  - A reset button (sets offset back to 0).
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/subtitle-offset.ts` |
| Create | `src/lib/__tests__/subtitle-offset.test.ts` |
| Modify | `src/hooks/use-subtitles.ts` (add offset state and VTT regeneration) |
| Modify | `src/components/player-controls.tsx` (add offset slider UI) |
