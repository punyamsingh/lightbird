# Plan 06 — Playlist Management Improvements [DONE]

## Implementation Summary (2026-03-11)

All 8 steps implemented:
- **Per-item remove button**: X button per item calls `onRemoveItem`; `usePlaylist.removeItem` adjusts `currentIndex` correctly.
- **Drag-and-drop reordering**: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` installed; `SortablePlaylistItem` with grip handle; `reorderItems` in hook preserves current item tracking.
- **Bulk folder import**: `FolderOpen` button + hidden `<input webkitdirectory>` in `PlaylistPanel`; `addFiles` method in `usePlaylist` creates items with UUID ids and loads duration metadata.
- **Export M3U8**: `src/lib/m3u-parser.ts` `exportPlaylist()`; Export button visible in header when playlist non-empty.
- **Import M3U8**: `parseM3U8()` in `m3u-parser.ts`; Import button + hidden file input; items wired through `onImportM3U` prop.
- **localStorage persistence**: Stream-type items saved/restored in `usePlaylist`; local file blob URLs not persisted.
- **Duration badges**: `getFileDuration(url)` called when adding files; duration stored on `PlaylistItem.duration`; formatted badge shown per item.
- **Sort controls**: Sort dropdown (Name A–Z/Z–A, Shortest/Longest first) shown when playlist has >1 item; calls `onReorder`.

**New files**: `src/lib/m3u-parser.ts`, `src/lib/__tests__/m3u-parser.test.ts`
**Modified**: `src/types/index.ts` (id, duration), `src/hooks/use-playlist.ts`, `src/components/playlist-panel.tsx`, `src/components/lightbird-player.tsx`, `src/hooks/__tests__/use-playlist.test.ts`, `src/components/__tests__/playlist-panel.test.tsx`
**Tests**: 155 passing (15 test suites)

## Problem

The current playlist is barebones:
- Items can be added but not reordered.
- There is no way to remove a single item without clearing the whole playlist.
- No support for bulk folder drops (all files in a folder at once).
- No way to save/load a playlist session for later.
- Playlist state is lost on page refresh.
- No visual duration metadata on playlist items.
- No sorting (by name, date, duration).

## Goal

Turn the playlist into a first-class feature:
- Drag-and-drop reordering.
- Per-item remove button.
- Bulk folder import.
- Export playlist as `.m3u8` / import from `.m3u8`.
- Persist playlist to `localStorage` across refreshes.
- Show duration badges on playlist items.
- Sort controls.

---

## Step-by-Step Implementation

### Step 1 — Per-Item Remove Button

The quickest win. In `PlaylistPanel`, add a remove icon button next to each playlist item:

```tsx
<div className="flex items-center gap-2 group">
  <button onClick={() => onSelectItem(index)} className="flex-1 text-left truncate">
    {item.name}
  </button>
  <button
    onClick={(e) => { e.stopPropagation(); onRemoveItem(index); }}
    className="opacity-0 group-hover:opacity-100 transition-opacity"
    aria-label="Remove from playlist"
  >
    <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
  </button>
</div>
```

Wire `onRemoveItem` prop from `LightBirdPlayer` via `usePlaylist` hook (Plan 03):

```ts
function removeItem(index: number) {
  setPlaylist(prev => prev.filter((_, i) => i !== index));
  if (index === currentIndex) nextItem();
  else if (index < currentIndex) setCurrentIndex(i => i - 1);
}
```

### Step 2 — Drag-and-Drop Reordering

Install `@dnd-kit/core` and `@dnd-kit/sortable` (lightweight, no jQuery dependency):

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Wrap the playlist list in `DndContext` and `SortableContext`:

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';

function PlaylistPanel({ playlist, onReorder, ... }) {
  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = playlist.findIndex(item => item.id === active.id);
      const newIndex = playlist.findIndex(item => item.id === over.id);
      onReorder(arrayMove(playlist, oldIndex, newIndex));
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={playlist.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {playlist.map((item, idx) => (
          <SortablePlaylistItem key={item.id} item={item} ... />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

Each item uses the `useSortable` hook to get drag handle attributes.

**Note**: Each `PlaylistItem` needs a stable unique `id`. Add `id: crypto.randomUUID()` when items are created in `usePlaylist`.

### Step 3 — Bulk Folder Import

The native file picker already supports folder input via `webkitdirectory`. Add a "Open Folder" button alongside the existing file picker:

```tsx
<input
  type="file"
  ref={folderInputRef}
  accept="video/*"
  multiple
  // @ts-expect-error — webkitdirectory is not in the TS types
  webkitdirectory=""
  className="hidden"
  onChange={handleFolderSelect}
/>
<Button variant="outline" onClick={() => folderInputRef.current?.click()}>
  Open Folder
</Button>
```

In the handler, filter to known video extensions and add all files:

```ts
function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
  const files = Array.from(e.target.files ?? [])
    .filter(f => /\.(mp4|mkv|webm|mov|avi|wmv|flv|m4v)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  playlist.addFiles(files);
}
```

### Step 4 — Export Playlist as M3U8

M3U8 is a plain-text format. For a file-based playlist, export contains file names (not paths, as browsers can't expose full system paths). For stream URLs, export the actual URLs.

```ts
function exportPlaylist(items: PlaylistItem[]): void {
  const lines = ['#EXTM3U'];
  for (const item of items) {
    lines.push(`#EXTINF:-1,${item.name}`);
    lines.push(item.type === 'stream' ? item.url : item.name);
  }
  const blob = new Blob([lines.join('\n')], { type: 'application/vnd.apple.mpegurl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lightbird-playlist.m3u8';
  a.click();
  URL.revokeObjectURL(url);
}
```

Add an "Export" button in the playlist panel header (visible only when playlist is non-empty).

### Step 5 — Import Playlist from M3U8

Parse M3U8 files dropped onto the playlist or selected via file picker:

```ts
function parseM3U8(text: string): Omit<PlaylistItem, 'id'>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items: Omit<PlaylistItem, 'id'>[] = [];
  let nextName: string | null = null;

  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      nextName = line.split(',').slice(1).join(',') || null;
    } else if (!line.startsWith('#')) {
      const isStream = line.startsWith('http');
      items.push({
        name: nextName ?? line,
        url: isStream ? line : '',
        type: isStream ? 'stream' : 'video',
      });
      nextName = null;
    }
  }
  return items;
}
```

Detect `.m3u` / `.m3u8` file extension during file drop and route to `parseM3U8` instead of treating as video.

### Step 6 — Persist Playlist to localStorage

In `usePlaylist`, persist on every change and restore on mount:

```ts
const STORAGE_KEY = 'lightbird-playlist';

// Restore on mount (stream URLs only — file object URLs are ephemeral)
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const items: PlaylistItem[] = JSON.parse(saved).filter((i: PlaylistItem) => i.type === 'stream');
    setPlaylist(items);
  }
}, []);

// Save on change
useEffect(() => {
  const serializable = playlist.filter(i => i.type === 'stream');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}, [playlist]);
```

Only stream URLs can be persisted (local file object URLs are revoked and invalid after refresh).

### Step 7 — Duration Badges on Playlist Items

When a local file is added to the playlist, read its duration using a hidden `<audio>`/`<video>` element:

```ts
async function getFileDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.src = URL.createObjectURL(file);
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      resolve(el.duration);
    };
    el.onerror = () => resolve(0);
  });
}
```

Store the duration on the `PlaylistItem` object and display it as a small badge:

```tsx
<span className="text-xs text-muted-foreground ml-auto shrink-0">
  {formatTime(item.duration ?? 0)}
</span>
```

### Step 8 — Sort Controls

Add a sort dropdown in the playlist panel header:

```tsx
<Select onValueChange={handleSort}>
  <SelectTrigger className="w-32 h-7 text-xs">
    <SelectValue placeholder="Sort by..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="name-asc">Name A–Z</SelectItem>
    <SelectItem value="name-desc">Name Z–A</SelectItem>
    <SelectItem value="duration-asc">Shortest first</SelectItem>
    <SelectItem value="duration-desc">Longest first</SelectItem>
  </SelectContent>
</Select>
```

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Modify | `src/components/playlist-panel.tsx` (remove button, DnD, folder input, export/import, sort) |
| Modify | `src/hooks/use-playlist.ts` (removeItem, reorder, persistence, duration loading) |
| Create | `src/lib/m3u-parser.ts` (M3U8 parse/export logic) |
| Install | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| Modify | `src/types/index.ts` (add `id`, `duration` to `PlaylistItem`) |

---

## Success Criteria

- Items can be reordered by drag-and-drop with visible drag handles.
- Each item has an X button that removes it without affecting playback of other items.
- Opening a folder adds all videos in it, sorted naturally.
- Export creates a valid `.m3u8` file; importing it back restores stream URLs.
- Stream URLs survive a page refresh.
- Each playlist item shows a duration badge (e.g. "1:23:45").
