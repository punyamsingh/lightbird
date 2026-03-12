# Issue CH-02 — useChapters Hook

**Plan:** chapters
**Labels:** `enhancement`
**Depends on:** CH-01
**Blocks:** CH-03, CH-04

---

## Problem

Chapter data needs to be wired reactively to the player's current time so the UI always knows which chapter is active.

## Goal

Create a `useChapters` hook that tracks the current chapter based on `currentTime`.

## Acceptance Criteria

- [ ] `src/hooks/use-chapters.ts` is created with `"use client"` directive.
- [ ] Signature:
  ```ts
  function useChapters(
    videoRef: RefObject<HTMLVideoElement>,
    playerRef: RefObject<VideoPlayer | null>
  ): {
    chapters: Chapter[];
    currentChapter: Chapter | null;
    goToChapter: (index: number) => void;
  }
  ```
- [ ] `chapters` is populated by calling `playerRef.current?.getChapters?.() ?? []` when the player is set.
- [ ] `currentChapter` updates on every `timeupdate` event: the chapter where `startTime <= currentTime < endTime`.
- [ ] `goToChapter(index)` sets `videoRef.current.currentTime = chapters[index].startTime`.
- [ ] `chapters` is reset to `[]` when the player changes (new file loaded).
- [ ] Tests in `src/hooks/__tests__/use-chapters.test.ts`:
  - Returns empty when player has no chapters.
  - `currentChapter` is null initially.
  - `currentChapter` updates correctly when `timeupdate` fires.
  - `goToChapter` sets `currentTime`.
- [ ] `lightbird-player.tsx` uses this hook and passes `chapters`, `currentChapter`, and `goToChapter` down to child components.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Create | `src/hooks/use-chapters.ts` |
| Create | `src/hooks/__tests__/use-chapters.test.ts` |
| Modify | `src/components/lightbird-player.tsx` (use hook, pass data to controls) |
