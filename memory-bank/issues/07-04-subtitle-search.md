# Issue 07-04 — Subtitle Search and Jump-to-Cue

**Plan:** 07 — Advanced Subtitle Support
**Phase:** 3 (Power Features)
**Labels:** `enhancement`, `subtitles`, `ui`, `plan-07`
**Depends on:** —
**Blocks:** —

---

## Problem

When a movie has hundreds of subtitle cues, there is no way to search through them or jump to a specific line.

## Goal

Add a subtitle search field that shows matching cues with timestamps; clicking a result seeks the video to that cue.

## Acceptance Criteria

- [ ] `src/lib/subtitle-search.ts` is created with:
  - `parseCuesFromVtt(vttText: string): SubtitleCue[]` — extracts `{ startTime: number; text: string }` objects from VTT text.
  - `SubtitleCue` type exported.
- [ ] Unit tests in `src/lib/__tests__/subtitle-search.test.ts`:
  - Parses a multi-cue VTT correctly (timestamps converted to seconds).
  - Returns empty array for empty input.
  - Search term matching works case-insensitively.
- [ ] `useSubtitles` (or a new `useSubtitleSearch` hook) exposes:
  - `cues: SubtitleCue[]` — built from the active subtitle's VTT.
  - `searchQuery: string` + `setSearchQuery: (q: string) => void`.
  - `searchResults: SubtitleCue[]` — filtered cues matching query (case-insensitive).
- [ ] A subtitle search UI is added to the subtitle section of `PlayerControls` (visible only when a subtitle is active and has cues):
  - An `Input` with placeholder "Search subtitles...".
  - A scrollable list of `searchResults` (max height ~200px), each showing timestamp + text.
  - Clicking a result calls `videoRef.current.currentTime = result.startTime`.
- [ ] The search UI is hidden when no subtitle is active.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/subtitle-search.ts` |
| Create | `src/lib/__tests__/subtitle-search.test.ts` |
| Modify | `src/hooks/use-subtitles.ts` (or new hook) (expose cues, searchQuery, searchResults) |
| Modify | `src/components/player-controls.tsx` (add subtitle search UI) |
