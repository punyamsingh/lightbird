# Issue 06-02 — Drag-and-Drop Playlist Reordering

**Plan:** 06 — Playlist Management
**Phase:** 2 (Core UX)
**Labels:** `enhancement`, `ui`, `plan-06`
**Depends on:** 06-01 (needs stable `id` field on PlaylistItem)
**Blocks:** —

---

## Problem

Playlist items cannot be reordered. Users must remove and re-add items to change order.

## Goal

Add drag-and-drop reordering to the playlist using `@dnd-kit`.

## Acceptance Criteria

- [ ] `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` are installed.
- [ ] `usePlaylist` exposes a `reorderItems(newOrder: PlaylistItem[]) => void` function that updates the playlist and adjusts `currentIndex` to follow the moved item.
- [ ] `PlaylistPanel` wraps the list in `DndContext` + `SortableContext`.
- [ ] Each item uses the `useSortable` hook and renders a `GripVertical` drag handle icon.
- [ ] Dragging an item reorders the playlist immediately (optimistic update).
- [ ] `currentIndex` correctly follows the currently-playing item after a reorder.
- [ ] Drag handle has `aria-label="Drag to reorder"`.
- [ ] Tests in `src/hooks/__tests__/use-playlist.test.ts` cover `reorderItems`:
  - After reorder, currentIndex tracks the playing item.
  - `arrayMove` behavior is correct for various indices.
- [ ] All existing tests still pass.

## Implementation Notes

`@dnd-kit` requires each item to have a stable unique `id` (provided by 06-01). Use `closestCenter` collision detection and `verticalListSortingStrategy`.

```tsx
function handleDragEnd({ active, over }: DragEndEvent) {
  if (!over || active.id === over.id) return;
  const oldIdx = playlist.findIndex(i => i.id === active.id);
  const newIdx = playlist.findIndex(i => i.id === over.id);
  onReorder(arrayMove(playlist, oldIdx, newIdx));
}
```

## Files

| Action | Path |
|--------|------|
| Install | `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` |
| Modify | `src/hooks/use-playlist.ts` (add `reorderItems`) |
| Modify | `src/components/playlist-panel.tsx` (DnD wrapper + sortable items) |
| Modify | `src/components/lightbird-player.tsx` (pass `onReorder` prop) |
