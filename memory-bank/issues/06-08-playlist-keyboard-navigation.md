# Issue 06-08 — Playlist Keyboard Navigation & Accessibility Audit

**Plan:** 06 — Playlist Management
**Phase:** 2 (Core UX)
**Labels:** `accessibility`, `enhancement`, `plan-06`
**Depends on:** 06-01, 06-02
**Blocks:** —

---

## Problem

The playlist panel is not fully keyboard-accessible. Users cannot navigate items, select them, or trigger remove via keyboard alone.

## Goal

Ensure the playlist panel meets basic keyboard accessibility requirements.

## Acceptance Criteria

- [ ] Each playlist item is a `<button>` (or has `role="button"` with `tabIndex={0}`) and is reachable via Tab.
- [ ] Pressing Enter or Space on a focused item selects and plays it.
- [ ] Remove button is reachable via Tab within the item row and activatable via Enter/Space.
- [ ] Currently playing item has visual focus indicator visible without hover (not just hover-reveal).
- [ ] Drag handles have `aria-roledescription="sortable"` per `@dnd-kit` best practices.
- [ ] Playlist panel has `aria-label="Playlist"` on its container.
- [ ] All existing tests still pass.
- [ ] Manual accessibility check: Tab through the playlist in browser, confirm all controls are reachable.

## Files

| Action | Path |
|--------|------|
| Modify | `src/components/playlist-panel.tsx` (ARIA attributes, keyboard handlers) |
