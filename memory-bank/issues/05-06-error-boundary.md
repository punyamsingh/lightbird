# Issue 05-06 — React Error Boundary for the Player

**Plan:** 05 — Robust Error Handling
**Phase:** 1 (Stability)
**Labels:** `enhancement`, `reliability`, `plan-05`
**Depends on:** —
**Blocks:** —

---

## Problem

An unexpected JavaScript error during render (e.g. a `null` dereference in a hook) crashes the entire page to a white screen. There is no fallback UI.

## Goal

Wrap the player in a React Error Boundary that catches render-phase errors and shows a recovery UI.

## Acceptance Criteria

- [ ] `src/components/player-error-boundary.tsx` is created as a class component implementing `componentDidCatch` and `getDerivedStateFromError`.
- [ ] When an error is caught:
  - Console logs the error and component stack (`console.error`).
  - Shows a fallback UI with the message "Something went wrong with the player." and a "Try again" button.
  - "Try again" resets `hasError` to `false` to attempt re-render.
- [ ] `PlayerErrorBoundary` wraps `<LightBirdPlayer />` in `src/app/page.tsx`.
- [ ] Component test in `src/components/__tests__/player-error-boundary.test.tsx`:
  - Renders children normally when no error.
  - Renders fallback UI when child throws during render.
  - "Try again" button resets the error state.
- [ ] All existing tests still pass.

## Implementation Notes

Error boundaries must be class components in React 18. They cannot be function components.

```tsx
// src/components/player-error-boundary.tsx
"use client";
import { Component, ReactNode } from 'react';

export class PlayerErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[LightBird]', error, info); }
  render() {
    if (this.state.hasError) { /* fallback UI */ }
    return this.props.children;
  }
}
```

## Files

| Action | Path |
|--------|------|
| Create | `src/components/player-error-boundary.tsx` |
| Create | `src/components/__tests__/player-error-boundary.test.tsx` |
| Modify | `src/app/page.tsx` (wrap LightBirdPlayer) |
