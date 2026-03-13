# Plan 12 — Magnet Link Player [DONE]

> **Status:** Implemented (2026-03-13)
>
> **Summary:** Added magnet link / BitTorrent streaming via WebTorrent v2. New files:
> `src/lib/magnet-player.ts`, `src/hooks/use-magnet.ts`, `src/types/webtorrent.d.ts`,
> `src/components/ui/alert-dialog.tsx`, `public/webtorrent-sw.js`.
> Modified: `src/types/index.ts` (added `source` field + `TorrentStatus`),
> `src/components/playlist-panel.tsx` (magnet input UI + progress bar),
> `src/components/lightbird-player.tsx` (wired hook + disclaimer dialog).
> 44 new tests added. All 281 tests pass.
> **Goal:** Allow users to paste a magnet URI into LightBird and stream video content
> directly in the browser via WebTorrent (BitTorrent over WebRTC/WebSocket).
> Single-video torrents play immediately; multi-file torrents add all videos to
> the playlist and start the first one automatically.

---

## Overview

Magnet links are a standard URI scheme (`magnet:?xt=urn:btih:<hash>&...`) used by
the BitTorrent protocol to identify and locate content without needing a central
.torrent file. **WebTorrent** is a browser-compatible BitTorrent client that uses
WebRTC for peer connections and WebSocket trackers — no browser plugin or native
binary required.

This feature is **legal technology** (same as VLC, Transmission, qBittorrent). Users
are responsible for accessing only content they have the legal right to use. A
one-time disclaimer is shown on first use.

---

## UX Flow

### Single video file in torrent
```text
User clicks 🔗 Magnet button (in PlaylistPanel)
  → Inline input field appears
  → User pastes magnet:? URI → clicks Load
  → "Fetching torrent info…" spinner (waiting for metadata)
  → Metadata ready → 1 video file found
  → Streaming starts immediately via MediaSource API
  → Download progress bar + peer count shown in controls area
```

### Multi-file / folder torrent
```text
User clicks 🔗 Magnet button → pastes URI → Load
  → "Fetching torrent info…"
  → Metadata ready → N video files found
  → All N items added to playlist (in torrent's file order)
  → First video starts streaming
  → Toast: "X videos added from [torrent name]"
  → Each subsequent video begins streaming on selection
```

### Error cases

| Situation | Message |
|---|---|
| Invalid magnet URI | Inline: "Not a valid magnet link" |
| No video files in torrent | "No video files found in this torrent" |
| Metadata timeout (30 s) | "Could not connect to peers. Check the link and try again." |
| WebTorrent unavailable | "Torrent streaming is not supported in this browser" |

---

## Technical Design

### Compatibility note — COEP headers
The app already sets `Cross-Origin-Embedder-Policy: require-corp` (needed for
FFmpeg.wasm / SharedArrayBuffer). This header restricts **subresource** loading but
does **not** affect WebRTC data channels or WebSocket connections. WebTorrent's
public trackers (`wss://tracker.openwebtorrent.com`, `wss://tracker.btorrent.xyz`)
use WebSocket — fully compatible.

### Streaming approach
WebTorrent's `file.renderTo(videoElement)` sets up progressive streaming via the
browser's **MediaSource API** without waiting for the full download. This integrates
into the existing `<video>` element in LightBirdPlayer by implementing the
`VideoPlayer` interface — `initialize(videoElement)` calls `file.renderTo(el)`
instead of setting `video.src`.

### WebTorrent ESM in Next.js
WebTorrent v2 is ESM-only. All player components are already `"use client"`, and the
client is loaded with a dynamic `await import('webtorrent')` inside `useEffect`. No
SSR concerns.

---

## Files to Create

### `src/lib/magnet-player.ts`
Stateless utilities + lazy singleton WebTorrent client.

```typescript
// Exports:
export const VIDEO_EXTENSIONS: string[]
export function isMagnetUri(str: string): boolean
export function isVideoFile(name: string): boolean
export function getVideoFiles(torrent: Torrent): TorrentFile[]
export async function getWebTorrentClient(): Promise<WebTorrent.Instance>
export function destroyWebTorrentClient(): void
```

- `isMagnetUri` — regex check for `magnet:?xt=urn:bt` prefix
- `getVideoFiles` — filter `torrent.files` by extension, sort by name
- `getWebTorrentClient` — lazy singleton; imports WebTorrent dynamically
- `destroyWebTorrentClient` — teardown for unmount / cleanup

### `src/lib/players/torrent-player.ts`
Implements the `VideoPlayer` interface for WebTorrent files.

```typescript
export interface TorrentPlayerFile {
  name: string;
  url: string; // empty string (renderTo handles the stream)
}

export class TorrentPlayer implements VideoPlayer {
  constructor(private torrentFile: TorrentFile) {}

  async initialize(videoElement: HTMLVideoElement): Promise<TorrentPlayerFile> {
    this.torrentFile.renderTo(videoElement);
    return { name: this.torrentFile.name, url: '' };
  }

  getAudioTracks() { return []; }
  getSubtitles() { return []; }
  async switchAudioTrack() {}
  async switchSubtitle() {}
  destroy() { /* renderTo cleanup is handled by WebTorrent */ }
}
```

### `src/hooks/use-magnet.ts`
React hook for WebTorrent lifecycle and state.

```typescript
interface MagnetState {
  status: 'idle' | 'loading-metadata' | 'ready' | 'error';
  torrentName: string;
  numPeers: number;
  downloadSpeed: number; // bytes/s
  uploadSpeed: number;
  progress: number;      // 0–1
  error: string | null;
}

interface UseMagnetReturn {
  magnetState: MagnetState;
  addMagnet(uri: string): Promise<PlaylistItem[]>;
  loadTorrentItem(itemId: string, videoEl: HTMLVideoElement): void;
  destroyMagnet(): void;
}
```

- Stores a `Map<itemId, TorrentFile>` (not in React state — avoids re-renders)
- `addMagnet`:
  1. Validates URI with `isMagnetUri`
  2. Shows first-use disclaimer (localStorage flag `lightbird_magnet_disclaimer_accepted`)
  3. Sets status to `'loading-metadata'`
  4. Calls `client.add(uri, { announce: [...publicTrackers] })`
  5. Listens for `'ready'` event (metadata received)
  6. Calls `getVideoFiles`, maps to `PlaylistItem[]` with `source: 'torrent'`
  7. Stores file objects in internal Map
  8. Sets status to `'ready'`
  9. Starts `'download'` event listener for speed/progress updates
- `loadTorrentItem` — looks up file by ID, calls `file.renderTo(videoEl)`
- `destroyMagnet` — removes torrent from client; resets state

### `src/lib/__tests__/magnet-player.test.ts`
Unit tests for all utilities:
- `isMagnetUri` — valid URIs, missing fields, plain URLs, empty string
- `isVideoFile` — all supported extensions, subtitle files, documents, case-insensitive
- `getVideoFiles` — filters non-video files, sorts by name, handles empty torrent

---

## Files to Modify

### `src/types/index.ts`
```typescript
export interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'stream';
  source?: 'file' | 'stream' | 'torrent'; // NEW
  file?: File;
  duration?: number;
}

export interface TorrentStatus { // NEW
  status: 'idle' | 'loading-metadata' | 'ready' | 'error';
  torrentName: string;
  numPeers: number;
  downloadSpeed: number;
  uploadSpeed: number;
  progress: number;
  error: string | null;
}
```

### `src/components/playlist-panel.tsx`
New props:
```typescript
onAddMagnet: (uri: string) => Promise<void>;
torrentStatus: TorrentStatus;
```

Changes:
- Add a `🔗` (Link2) icon button in the upload controls row, next to the stream URL button
- Toggle inline magnet input (similar to the stream URL input pattern already there)
- Show validation error inline if URI is invalid
- While `torrentStatus.status === 'loading-metadata'`: show spinner + "Fetching torrent info…"
- While `torrentStatus.status === 'ready'` and progress < 1: show a thin progress bar
  below the playlist with peers + download speed (e.g. "↓ 2.3 MB/s · 14 peers")

### `src/components/lightbird-player.tsx`
- Add `useMagnet()` hook
- Implement `handleAddMagnet(uri)`:
  1. Calls `magnetHook.addMagnet(uri)`
  2. If returns items → `addToPlaylist(items)` and optionally auto-play first
  3. Shows toast: "X video(s) added from [torrent name]"
- Modify `loadVideo` / video-selection path:
  - If `currentItem.source === 'torrent'` → call `magnetHook.loadTorrentItem(id, videoRef.current)` instead of `createVideoPlayer`
- Pass `onAddMagnet` and `torrentStatus` to `PlaylistPanel`
- Call `magnetHook.destroyMagnet()` when torrent items are removed from playlist

### `next.config.ts`
Add `'webtorrent'` to `transpilePackages` if build fails without it:
```typescript
transpilePackages: ['lucide-react', 'webtorrent'],
```

### `memory-bank/project-overview.md`
- Add Plan 12 row to roadmap table (mark DONE when complete)
- Document new tech: WebTorrent, magnet link support
- Note the new `source` field on `PlaylistItem`

---

## Disclaimer Dialog (one-time)

Key: `lightbird_magnet_disclaimer_accepted` in `localStorage`.

Text:
> **Magnet Link Streaming**
> LightBird streams content via BitTorrent (WebRTC/WebSocket). This is the same
> technology used by applications like VLC and Transmission.
>
> **You are responsible for ensuring you have the legal right to access any content
> you stream.** LightBird does not host, index, or endorse any content.
>
> [Don't show again]  [I Understand — Continue]

Built with the existing `Dialog` / `AlertDialog` Radix primitive already in the project.

---

## Public Trackers to Bundle

Include a small default tracker list so torrents with no announce URLs still work:
```typescript
const DEFAULT_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
];
```

---

## Dependencies

```bash
npm install webtorrent
```

No additional `@types/` package needed — WebTorrent v2 ships its own TypeScript types.

---

## Implementation Order

1. `npm install webtorrent`
2. Write `src/lib/magnet-player.ts` (pure utilities, no React)
3. Write `src/lib/__tests__/magnet-player.test.ts` — run tests
4. Write `src/lib/players/torrent-player.ts`
5. Update `src/types/index.ts`
6. Write `src/hooks/use-magnet.ts`
7. Update `src/components/playlist-panel.tsx` (new button + magnet input UI)
8. Update `src/components/lightbird-player.tsx` (wire hook + torrent load path)
9. Run full test suite (`npm test`) — fix any regressions
10. Update `memory-bank/project-overview.md`
11. Commit and push to `claude/magnet-link-player-49QkV`

---

## Success Criteria

- [ ] `isMagnetUri` correctly validates/rejects URIs
- [ ] Pasting a valid magnet link starts fetching torrent metadata
- [ ] Single-video torrent: video streams without waiting for full download
- [ ] Multi-video torrent: all video files are added to the playlist
- [ ] Non-video files in torrent are silently ignored
- [ ] Download speed and peer count update live in the UI
- [ ] Disclaimer shown on first use; not shown again after acceptance
- [ ] Invalid URI shows inline validation error (no crash)
- [ ] Removing all torrent items from playlist cleans up the WebTorrent session
- [ ] `npm test` passes with no regressions
- [ ] CI green on push
