# Issue 10-03 — Audit and Remove Unused ShadCN UI Components

**Plan:** 10 — Codebase Cleanup
**Phase:** 1 (Stability)
**Labels:** `cleanup`, `bundle-size`, `plan-10`
**Depends on:** —
**Blocks:** —

---

## Problem

`src/components/ui/` contains 35 ShadCN components. Many are unused, adding bundle weight and maintenance surface area.

## Goal

Identify and remove all ShadCN components that are not imported anywhere in the app.

## Acceptance Criteria

- [ ] A systematic check identifies which components are imported (via grep across `src/**/*.ts`, `src/**/*.tsx`, excluding the component file itself).
- [ ] All components with zero imports outside their own file are deleted.
- [ ] After deletion, `npm run build` still succeeds (verifies no hidden imports were missed).
- [ ] All tests still pass.
- [ ] A comment is added to `CLAUDE.md` (or the memory bank) listing which ShadCN components remain, to prevent re-installing unused ones in the future.

## Implementation Notes

Run this to get a quick count per component:
```bash
for f in src/components/ui/*.tsx; do
  name=$(basename "$f" .tsx)
  count=$(grep -rl "from.*components/ui/$name" src/ | grep -v "^$f" | wc -l)
  echo "$count $name"
done | sort -n
```

Components known to be used (do not delete): `button`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `progress`, `scroll-area`, `select`, `separator`, `sheet`, `slider`, `switch`, `tabs`, `toast`, `toaster`, `tooltip`.

## Files

| Action | Path |
|--------|------|
| Delete | Unused `src/components/ui/*.tsx` files (determined by audit) |
