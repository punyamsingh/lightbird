# Issue 10-01 — Remove Deprecated stubs from video-processor.ts

**Plan:** 10 — Codebase Cleanup
**Phase:** 1 (Stability, do first)
**Labels:** `cleanup`, `plan-10`
**Depends on:** —
**Blocks:** —

---

## Problem

`src/lib/video-processor.ts` contains `probeFile()` and `remuxFile()` functions marked as `@deprecated` in JSDoc. They do nothing useful (just log a warning) and confuse any developer reading the file.

## Goal

Remove the dead code and ensure nothing in the codebase depends on it.

## Acceptance Criteria

- [ ] A grep search confirms no code outside `video-processor.ts` calls `probeFile` or `remuxFile`.
  ```bash
  grep -r "probeFile\|remuxFile" src/ --include="*.ts" --include="*.tsx"
  ```
- [ ] Both functions are deleted from `video-processor.ts`.
- [ ] If any callers are found, they are migrated to use `createVideoPlayer()` before deletion.
- [ ] `src/lib/__tests__/video-processor.test.ts` is updated: any tests for the deprecated functions are deleted.
- [ ] All remaining tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/video-processor.ts` (delete deprecated functions) |
| Modify | `src/lib/__tests__/video-processor.test.ts` (remove tests for deleted functions) |
