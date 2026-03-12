# Issue 10-08 — Remove Dead Code from MKV Player

**Plan:** 10 — Codebase Cleanup
**Phase:** 1 (Stability)
**Labels:** `cleanup`, `plan-10`
**Depends on:** —
**Blocks:** —

---

## Problem

`src/lib/players/mkv-player.ts` contains commented-out code blocks and `TODO` comments referencing the old placeholder approach from before Plan 02 was implemented. This dead code misleads developers.

## Goal

Clean up `mkv-player.ts` so it contains only live, intentional code.

## Acceptance Criteria

- [ ] All commented-out code blocks in `mkv-player.ts` are deleted (not just `//`-commented code but also `/* */` blocks that represent old approaches).
- [ ] `TODO` comments that reference the old placeholder approach are deleted. If a TODO references a real future task, it is converted to a reference to the relevant plan/issue.
- [ ] Any dead imports (imports of symbols that are no longer used after cleanup) are removed.
- [ ] File still passes `npm run typecheck`.
- [ ] All tests for `mkv-player.ts` still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/players/mkv-player.ts` |
