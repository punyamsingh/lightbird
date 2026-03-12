# Issue CH-04 — Chapters Menu & Current Chapter Display

**Plan:** chapters
**Labels:** `enhancement`, `ui`
**Depends on:** CH-02
**Blocks:** —

---

## Problem

Even with seek bar ticks, there is no way to see all chapter titles at once or navigate directly to a named chapter. The current chapter name is also not displayed.

## Goal

1. Show the current chapter name below the seek bar (when chapters exist).
2. Add a "Chapters" button that opens a popover listing all chapters; clicking one seeks to it.
3. Add `[` / `]` keyboard shortcuts for previous/next chapter.

---

## Acceptance Criteria

- [ ] **Current chapter display**: When `currentChapter` is non-null, a `<span>` below the seek bar shows `currentChapter.title` (styled as `text-xs text-muted-foreground`). Hidden when no chapters.
- [ ] **Chapters button**: A `List` (lucide-react) icon button is added to `PlayerControls`, visible only when `chapters.length > 0`.
  - Tooltip: "Chapters"
  - Clicking opens a `Popover` / `Sheet` listing all chapters.
  - Each row: chapter title on the left, formatted start time on the right.
  - Currently active chapter is visually highlighted.
  - Clicking a row calls `goToChapter(index)` and closes the menu.
- [ ] **Keyboard shortcuts** for `[` (previous chapter) and `]` (next chapter) are added to `useKeyboardShortcuts` / the shortcut registry:
  - Previous chapter: seek to `currentChapter.startTime` if `currentTime > startTime + 3s`, else seek to previous chapter's start.
  - Next chapter: seek to next chapter's `startTime`.
  - No-op if there are no chapters.
- [ ] Tests in `src/components/__tests__/player-controls.test.tsx`:
  - Chapters button hidden when `chapters` is empty.
  - Chapters button visible when chapters are provided.
  - Clicking a chapter item calls `goToChapter` with the correct index.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/components/player-controls.tsx` (current chapter label, chapters button + popover) |
| Modify | `src/lib/keyboard-shortcuts.ts` (add prev-chapter, next-chapter actions) |
| Modify | `src/hooks/use-keyboard-shortcuts.ts` (wire prev/next chapter handlers) |
| Modify | `src/components/lightbird-player.tsx` (pass currentChapter, goToChapter to controls) |
