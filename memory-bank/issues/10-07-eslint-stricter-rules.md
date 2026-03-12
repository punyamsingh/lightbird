# Issue 10-07 — Tighten ESLint Configuration

**Plan:** 10 — Codebase Cleanup
**Phase:** 1 (Stability)
**Labels:** `cleanup`, `quality`, `plan-10`
**Depends on:** 10-02 (strict build on)
**Blocks:** —

---

## Problem

The current ESLint config uses only the default Next.js rules, which are fairly permissive. `any` types, unused variables, and missing hook deps go unreported.

## Goal

Add stricter ESLint rules and fix all violations.

## Acceptance Criteria

- [ ] `eslint.config.mjs` is updated with these rules:
  ```js
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  }
  ```
- [ ] `npm run lint` passes with zero errors (warnings are acceptable for `no-explicit-any` and `react-hooks/exhaustive-deps` initially, but errors must be zero).
- [ ] All `console.log` statements in `src/` are replaced with `console.warn` or `console.error`, or removed.
- [ ] All unused variables either renamed with `_` prefix or removed.
- [ ] All tests still pass.

## Files

| Action | Path |
|--------|------|
| Modify | `eslint.config.mjs` |
| Modify | Various `src/` files (fix lint violations) |
