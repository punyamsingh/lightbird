# Issue 10-05 — "use client" Directive Audit

**Plan:** 10 — Codebase Cleanup
**Phase:** 1 (Stability)
**Labels:** `cleanup`, `nextjs`, `plan-10`
**Depends on:** 10-02 (strict build must be on to catch these)
**Blocks:** —

---

## Problem

Next.js App Router requires `"use client"` at the top of any file that uses hooks, browser APIs, or event handlers. Missing directives cause cryptic server-component errors when strict TypeScript/ESLint is enabled.

## Goal

Audit all component and hook files and add `"use client"` wherever it is required.

## Acceptance Criteria

- [ ] All files in `src/components/` (except Server Components, if any) that use `useState`, `useEffect`, `useRef`, `onClick`, `window.`, `document.`, or `localStorage.` have `"use client"` as their first line.
- [ ] All files in `src/hooks/` have `"use client"` (hooks are always client-side).
- [ ] No Server Components are accidentally converted to Client Components (audit any `src/app/` files).
- [ ] `npm run build` succeeds after changes.
- [ ] All tests still pass.

## Implementation Notes

Quick audit command:
```bash
grep -rL '"use client"' src/components/ src/hooks/ \
  | xargs grep -l 'useState\|useEffect\|useRef\|onClick\|window\.\|localStorage\.'
```

Files returned need `"use client"` added as first line.

## Files

| Action | Path |
|--------|------|
| Modify | Various `src/components/*.tsx` and `src/hooks/*.ts` (add directive where missing) |
