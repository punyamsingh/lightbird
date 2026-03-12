# Issue 10-02 — Re-enable TypeScript and ESLint Strict Checking

**Plan:** 10 — Codebase Cleanup
**Phase:** 1 (Stability, do first)
**Labels:** `cleanup`, `quality`, `plan-10`
**Depends on:** —
**Blocks:** —

---

## Problem

`next.config.ts` has `typescript: { ignoreBuildErrors: true }` and `eslint: { ignoreDuringBuilds: true }`. Real type and lint errors are silently hidden in production builds, creating a false sense of correctness.

## Goal

Remove the suppression flags, fix all errors that surface, and ensure `npm run build` completes cleanly.

## Acceptance Criteria

- [ ] Both `ignoreBuildErrors` and `ignoreDuringBuilds` are removed from `next.config.ts`.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run build` completes successfully.
- [ ] All existing tests still pass.

## Implementation Notes

Run `npm run typecheck` first to see what errors surface. Common fixes:
- Add explicit return types to exported functions.
- Replace `any` with proper types.
- Add `"use client"` to components using hooks (per issue 10-07).
- Fix unused variable warnings.

This issue should be done EARLY in Plan 10 so all subsequent work is built on a clean foundation.

## Files

| Action | Path |
|--------|------|
| Modify | `next.config.ts` (remove ignore flags) |
| Modify | Various `src/` files as needed to fix surfaced errors |
