# Issue CH-03 — Chapter Tick Marks on Seek Bar

**Plan:** chapters
**Labels:** `enhancement`, `ui`
**Depends on:** CH-02
**Blocks:** —

---

## Problem

The seek bar is a plain `<Slider>` with no visual indication of chapter boundaries. Users cannot tell where chapters start.

## Goal

Render chapter markers as thin tick marks on the seek bar, with hover tooltips showing chapter title and start time.

## Acceptance Criteria

- [ ] `PlayerControls` receives `chapters: Chapter[]` and `duration: number` props.
- [ ] When `chapters.length > 0`, thin vertical tick marks are overlaid on the seek bar track:
  - Position: `left: (chapter.startTime / duration) * 100 + '%'`
  - Style: `position: absolute; width: 2px; height: 100%; background: white; opacity: 0.5; pointer-events: none`
  - Except the first chapter (index 0, startTime = 0) — no tick at the very start.
- [ ] Each tick has a tooltip (on hover) showing `"Chapter title — HH:MM:SS"`.
- [ ] The seek bar container gains `position: relative` to allow absolute-positioned ticks.
- [ ] The tick overlay does not interfere with drag interaction on the slider (all ticks have `pointer-events: none`).
- [ ] Tests in `src/components/__tests__/player-controls.test.tsx`:
  - No tick marks when `chapters` is empty.
  - Correct number of ticks when chapters are provided (n-1 ticks for n chapters, skipping first).
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/components/player-controls.tsx` (add chapter ticks overlay) |
| Modify | `src/components/__tests__/player-controls.test.tsx` (add tick tests) |
| Modify | `src/components/lightbird-player.tsx` (pass chapters + duration to PlayerControls) |
