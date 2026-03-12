# Chapters & Cue Points — Master Plan

**Status:** 🔲 PENDING
**Priority:** LOW-MEDIUM
**New dependencies:** None

---

## Problem

MKV, MP4, and WebM files often contain chapter metadata (e.g. "Introduction", "Act 1", "Credits"). LightBird ignores this data entirely. Users have no visual indication of chapter boundaries on the seek bar, and no way to jump between chapters.

---

## Goals

1. Extract chapter data from MKV files during the FFmpeg probe phase.
2. Parse chapter data from MP4/WebM files via the WebVTT Chapters track format.
3. Render chapter markers as tick marks on the seek bar.
4. Show the current chapter name in the player UI (e.g. below the seek bar).
5. Add "previous chapter" / "next chapter" keyboard shortcuts.
6. Show a chapters menu accessible from the controls.

---

## Data Shape

```ts
// Add to src/types/index.ts
export interface Chapter {
  index: number;
  title: string;
  startTime: number;   // seconds
  endTime: number;     // seconds (= next chapter's startTime, or video duration)
}
```

---

## Architecture

```
MKV files:   FFmpeg probe log → parseChaptersFromFFmpegLog() → Chapter[]
WebVTT:      <track kind="chapters"> → parseChaptersFromVtt() → Chapter[]
useChapters hook → { chapters, currentChapter, goToChapter }
PlayerControls → chapter tick marks on seek bar + chapter name display
```

---

## Issues

| # | File | What it delivers |
|---|------|-----------------|
| 01 | `01-chapter-extraction.md` | Extract chapters from FFmpeg logs + VTT |
| 02 | `02-use-chapters-hook.md` | `useChapters` hook |
| 03 | `03-seek-bar-markers.md` | Chapter tick marks on the seek bar |
| 04 | `04-chapter-menu.md` | Chapter list menu in controls |

---

## Success Criteria

- An MKV with embedded chapters shows tick marks on the seek bar.
- Hovering over a tick mark shows a tooltip with the chapter title and timestamp.
- The current chapter name is displayed below the seek bar.
- Pressing `]` jumps to the next chapter; `[` jumps to the previous chapter.
- A "Chapters" button opens a popup listing all chapters; clicking one seeks to it.
- Files without chapters behave identically to before (no UI changes).
