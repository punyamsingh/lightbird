# Issue 05-03 — File Validation Before Load

**Plan:** 05 — Robust Error Handling
**Phase:** 1 (Stability)
**Labels:** `enhancement`, `plan-05`
**Depends on:** —
**Blocks:** 05-04

---

## Problem

Users can drop any file (a 50 GB ISO, a `.txt` file, etc.) and the player silently fails or hangs. There is no pre-flight validation.

## Goal

Validate files before attempting to load them and surface specific, actionable errors immediately.

## Acceptance Criteria

- [ ] `src/lib/file-validator.ts` is created with a `validateVideoFile(file: File): { valid: boolean; reason?: string }` function.
- [ ] Validation rejects files larger than 10 GB with a size-specific message (e.g. "File is 12.3 GB — maximum is 10 GB").
- [ ] Validation rejects files whose extension is not in the supported list: `mp4, webm, mkv, mov, avi, wmv, flv, m4v, ogv`.
- [ ] Unit tests in `src/lib/__tests__/file-validator.test.ts` cover:
  - Valid MP4 file → passes
  - Valid MKV file → passes
  - File with unsupported extension → fails with reason
  - File over 10 GB → fails with reason
  - File exactly 10 GB → passes
- [ ] `validateVideoFile` is called in `lightbird-player.tsx` before any file processing; invalid files show a toast with the `reason` and return early.
- [ ] All existing tests still pass.

## Implementation Notes

```ts
// src/lib/file-validator.ts
const MAX_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const SUPPORTED_EXTENSIONS = ['mp4','webm','mkv','mov','avi','wmv','flv','m4v','ogv'];

export function validateVideoFile(file: File): { valid: boolean; reason?: string } { ... }
```

Extension check must be case-insensitive.

## Files

| Action | Path |
|--------|------|
| Create | `src/lib/file-validator.ts` |
| Create | `src/lib/__tests__/file-validator.test.ts` |
| Modify | `src/components/lightbird-player.tsx` (call validateVideoFile before processFile) |
