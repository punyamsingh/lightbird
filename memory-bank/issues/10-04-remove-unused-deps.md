# Issue 10-04 — Remove Unused Dependencies (Firebase, Genkit, ReCharts)

**Plan:** 10 — Codebase Cleanup
**Phase:** 1 (Stability)
**Labels:** `cleanup`, `bundle-size`, `plan-10`
**Depends on:** —
**Blocks:** —

---

## Problem

Three large dependencies are installed but provide zero functionality:
- **Firebase** (~200 kB gzipped): configured but no feature uses it.
- **Google Genkit** + `@genkit-ai/googleai` + `@genkit-ai/next`: `src/ai/` directory set up but unused.
- **ReCharts**: no chart components exist in the UI.

## Goal

Remove all three (or isolate them if future use is planned) to reduce install size and bundle weight.

## Acceptance Criteria

- [ ] **Decision made** (document in memory bank): remove Firebase, Genkit, and ReCharts unless there is a concrete near-term plan for them.
  - If removing: follow steps below.
  - If keeping for future: move to `devDependencies` and ensure they are NOT imported from any client bundle path.
- [ ] **Firebase removal** (if decided):
  - `npm uninstall firebase`
  - Delete `firebase.json`, `apphosting.yaml`
  - Confirm no `import ... from 'firebase'` remains in `src/`
- [ ] **Genkit removal** (if decided):
  - `npm uninstall genkit @genkit-ai/googleai @genkit-ai/next`
  - Delete `src/ai/` directory
  - Remove `genkit:dev` and `genkit:watch` from `package.json` scripts
- [ ] **ReCharts removal**:
  - `npm uninstall recharts`
  - Confirm `grep -r "recharts" src/` returns nothing
- [ ] `npm run build` succeeds after removals.
- [ ] `npm install` completes without errors.
- [ ] All tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `package.json` (uninstall packages, remove scripts) |
| Delete | `src/ai/` directory |
| Delete | `firebase.json`, `apphosting.yaml` (if Firebase removed) |
