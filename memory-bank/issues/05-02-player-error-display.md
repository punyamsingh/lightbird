# Issue 05-02 — PlayerErrorDisplay Component

**Plan:** 05 — Robust Error Handling
**Phase:** 1 (Stability)
**Labels:** `enhancement`, `ui`, `plan-05`
**Depends on:** 05-01 (media-error.ts must exist)
**Blocks:** 05-04

---

## Problem

When a video fails there is no visible error state. The player looks the same as when it's loading: a black rectangle with no feedback.

## Goal

Create a UI overlay component that displays the parsed error with actionable recovery buttons.

## Acceptance Criteria

- [ ] `src/components/player-error-display.tsx` is created.
- [ ] Component accepts `{ error: ParsedMediaError, onRetry?, onSkip, onDismiss }` props.
- [ ] Shows an error icon, human-readable message, and appropriate buttons:
  - "Retry" button: visible only when `error.retryable === true`
  - "Skip to Next" button: always visible
  - "Dismiss" button: always visible
- [ ] Component has `"use client"` directive.
- [ ] Component test in `src/components/__tests__/player-error-display.test.tsx`:
  - Renders message text
  - Retry button hidden when `retryable: false`
  - Retry button visible when `retryable: true`
  - All callback props are called on click
- [ ] All existing tests still pass.

## Implementation Notes

Use `AlertCircle` from `lucide-react` for the icon. Use existing `Button` from `src/components/ui/button.tsx`.

The overlay should be `position: absolute, inset-0` so it fills the player area. Background: `bg-black/80`.

## Files

| Action | Path |
|--------|------|
| Create | `src/components/player-error-display.tsx` |
| Create | `src/components/__tests__/player-error-display.test.tsx` |
