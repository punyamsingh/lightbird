# Issue 07-05 — UniversalSubtitleManager Enhancement

**Plan:** 07 — Advanced Subtitle Support
**Phase:** 3 (Power Features)
**Labels:** `refactor`, `subtitles`, `plan-07`
**Depends on:** 07-01, 07-02, 07-03
**Blocks:** —

---

## Problem

After implementing encoding detection (07-01), offset support (07-02), and ASS rendering (07-03) separately, `subtitle-manager.ts` needs to be the single integration point that routes subtitle files to the correct handler.

## Goal

Refactor `UniversalSubtitleManager` to coordinate all subtitle features: encoding detection, offset application, format routing (VTT/SRT → track element, ASS/SSA → canvas renderer).

## Acceptance Criteria

- [ ] All subtitle file reads go through `readSubtitleFile()` from 07-01.
- [ ] `UniversalSubtitleManager.setOffset(subtitleId: string, seconds: number)` is implemented:
  - Regenerates the VTT blob URL with the offset applied.
  - Updates the active `<track>` element's `src`.
- [ ] `UniversalSubtitleManager.addSubtitle(file: File)`:
  - Detects file type by extension.
  - For `.srt`, `.vtt`: converts to VTT, applies current offset, adds as `<track>`.
  - For `.ass`, `.ssa`: routes to `ASSRenderer` (passed in constructor or via `setCanvas()`).
- [ ] Existing test suite for `subtitle-manager.ts` is updated to reflect new API.
- [ ] All existing tests still pass (update as needed for API changes).

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/subtitle-manager.ts` (integrate all subtitle features) |
| Modify | `src/lib/__tests__/subtitle-manager.test.ts` (update/extend tests) |
