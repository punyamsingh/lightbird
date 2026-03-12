# Issue 07-01 — Subtitle File Encoding Detection

**Plan:** 07 — Advanced Subtitle Support
**Phase:** 3 (Power Features)
**Labels:** `bug`, `subtitles`, `plan-07`
**Depends on:** —
**Blocks:** —

---

## Problem

SRT subtitle files encoded in Windows-1252, ISO-8859-1, or other non-UTF-8 encodings render as garbled characters (e.g. `â€™` instead of `'`). The subtitle converter reads all files as UTF-8.

## Goal

Detect the file encoding before parsing and decode correctly using the detected charset.

## Acceptance Criteria

- [ ] `chardet` npm package is installed.
- [ ] A `readSubtitleFile(file: File): Promise<string>` function is created in `src/lib/subtitle-manager.ts` (or a new `src/lib/subtitle-file-reader.ts`).
- [ ] The function detects encoding using `chardet.detect(Buffer.from(arrayBuffer))`.
- [ ] Falls back to `'UTF-8'` if detection returns `null` or an unsupported encoding.
- [ ] Uses `TextDecoder(detectedEncoding)` to decode the buffer.
- [ ] All subtitle file reads in the codebase use this function instead of `file.text()`.
- [ ] Unit tests in `src/lib/__tests__/subtitle-file-reader.test.ts`:
  - UTF-8 file decoded correctly.
  - Windows-1252 buffer (with known bytes) decoded correctly (e.g. `0xE9` → `é`).
  - Null detection result falls back to UTF-8.
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Install | `chardet` |
| Create | `src/lib/subtitle-file-reader.ts` |
| Create | `src/lib/__tests__/subtitle-file-reader.test.ts` |
| Modify | `src/lib/subtitle-manager.ts` (use readSubtitleFile instead of file.text()) |
