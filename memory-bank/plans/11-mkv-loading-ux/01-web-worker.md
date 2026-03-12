# Sub-plan 01 — Move FFmpeg to a Web Worker

## Status: PENDING

## Problem

`MKVPlayer.initialize()` calls `ffmpeg.exec()` on the **main thread**. FFmpeg.wasm is
CPU-intensive and runs for 10–60 seconds on large files. During this time:
- The browser tab is completely unresponsive.
- React cannot re-render (progress bar never moves visually).
- The user cannot scroll, click, or interact with anything.

---

## Goal

Run FFmpeg inside a dedicated Web Worker so the main thread stays free during remux.

---

## Critical Insight: Two Separate FFmpeg Instances

The existing `ffmpeg-singleton.ts` creates a **main-thread** FFmpeg instance. This **cannot
be shared with a Worker** — Workers have their own JS heap; you cannot pass a live object
across the thread boundary.

The Worker must create its **own** FFmpeg instance internally. The singleton in
`ffmpeg-singleton.ts` becomes unused by the MKV player (but keep it for now — it may be
used by other code in the future).

---

## New File: `src/lib/workers/ffmpeg-worker.ts`

This is the complete Worker. Create it exactly as shown.

```typescript
/// <reference lib="webworker" />

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

// ─── Message Protocol ────────────────────────────────────────────────────────

// Messages sent FROM main thread TO worker
export type WorkerInbound =
  | {
      id: string;
      type: 'REMUX';
      payload: {
        file: File;
        fileName: string;
        audioTrackIndex: number;
      };
    }
  | {
      id: string;
      type: 'PROBE';
      payload: {
        file: File;
        fileName: string;
      };
    }
  | {
      id: string;
      type: 'EXTRACT_SUBTITLE';
      payload: {
        file: File;
        fileName: string;
        trackIndex: number;
      };
    };

// Messages sent FROM worker TO main thread
export type WorkerOutbound =
  | { id: string; type: 'PROGRESS'; progress: number }
  | { id: string; type: 'REMUX_DONE'; data: Uint8Array; logs: string }
  | { id: string; type: 'PROBE_DONE'; logs: string }
  | { id: string; type: 'EXTRACT_SUBTITLE_DONE'; srtText: string }
  | { id: string; type: 'ERROR'; error: string };

// ─── FFmpeg Instance (worker-local, not the main-thread singleton) ───────────

let ffmpeg: FFmpeg | null = null;

async function getWorkerFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return ffmpeg;
}

// ─── Message Handler ─────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerInbound>) => {
  const { id, type, payload } = event.data;

  try {
    const ff = await getWorkerFFmpeg();

    if (type === 'PROBE') {
      const logs: string[] = [];
      const logHandler = ({ message }: { message: string }) => logs.push(message);
      ff.on('log', logHandler);

      await ff.writeFile(payload.fileName, await fetchFile(payload.file));
      try {
        await ff.exec(['-i', payload.fileName, '-f', 'null', '-']);
      } catch {
        // FFmpeg exits non-zero when output is /dev/null — expected
      }

      ff.off('log', logHandler);

      self.postMessage({ id, type: 'PROBE_DONE', logs: logs.join('\n') } satisfies WorkerOutbound);

    } else if (type === 'EXTRACT_SUBTITLE') {
      await ff.writeFile(payload.fileName, await fetchFile(payload.file));
      const outputName = `subtitle_${payload.trackIndex}_${Date.now()}.srt`;

      await ff.exec([
        '-i', payload.fileName,
        '-map', `0:s:${payload.trackIndex}`,
        outputName,
      ]);

      const data = await ff.readFile(outputName) as Uint8Array;
      try { await ff.deleteFile(outputName); } catch { /* ignore */ }

      const srtText = new TextDecoder().decode(data);
      self.postMessage({ id, type: 'EXTRACT_SUBTITLE_DONE', srtText } satisfies WorkerOutbound);

    } else if (type === 'REMUX') {
      // Wire up progress reporting
      const progressHandler = ({ progress }: { progress: number }) => {
        self.postMessage({
          id,
          type: 'PROGRESS',
          progress: Math.max(0, Math.min(0.99, progress)),
        } satisfies WorkerOutbound);
      };
      ff.on('progress', progressHandler);

      try {
        // Probe first (to get track info)
        const logs: string[] = [];
        const logHandler = ({ message }: { message: string }) => logs.push(message);
        ff.on('log', logHandler);

        if (!ffmpegHasFile(ff, payload.fileName)) {
          await ff.writeFile(payload.fileName, await fetchFile(payload.file));
        }

        try {
          await ff.exec(['-i', payload.fileName, '-f', 'null', '-']);
        } catch { /* expected */ }
        ff.off('log', logHandler);

        // Remux
        const outputName = `output_${Date.now()}.mp4`;
        await ff.exec([
          '-i', payload.fileName,
          '-map', '0:v:0',
          '-map', `0:a:${payload.audioTrackIndex}`,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-movflags', 'frag_keyframe+empty_moov',
          outputName,
        ]);

        const data = await ff.readFile(outputName) as Uint8Array;
        try { await ff.deleteFile(outputName); } catch { /* ignore */ }

        // Transfer the buffer (zero-copy) back to main thread
        self.postMessage(
          { id, type: 'REMUX_DONE', data, logs: logs.join('\n') } satisfies WorkerOutbound,
          [data.buffer],
        );

      } finally {
        ff.off('progress', progressHandler);
      }
    }

  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    } satisfies WorkerOutbound);
  }
};

// Helper: check if a file already exists in the FFmpeg virtual FS
// (avoids re-uploading the same file on repeated operations)
function ffmpegHasFile(ff: FFmpeg, name: string): boolean {
  try {
    ff.listDir('/').find((f) => f.name === name);
    return true;
  } catch {
    return false;
  }
}
```

> **Note on `satisfies WorkerOutbound`:** TypeScript compile-time check that the posted
> message matches the protocol. Safe to remove if it causes issues — it's not runtime code.

---

## Updated `src/lib/players/mkv-player.ts`

Replace the direct FFmpeg calls with Worker communication. Key changes only (show diffs):

### 1. Add Worker management at the top of the class

```typescript
export class MKVPlayer {
  // ... existing fields ...

  private worker: Worker | null = null;
  private pendingOperations: Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = new Map();

  private getWorker(): Worker {
    if (!this.worker) {
      // Next.js requires this exact syntax for Worker bundling
      this.worker = new Worker(
        new URL('../workers/ffmpeg-worker.ts', import.meta.url),
      );
      this.worker.onmessage = (event: MessageEvent) => {
        this._handleWorkerMessage(event.data);
      };
      this.worker.onerror = (error) => {
        console.error('FFmpeg worker error:', error);
      };
    }
    return this.worker;
  }

  private _handleWorkerMessage(msg: WorkerOutbound): void {
    const { id, type } = msg;

    if (type === 'PROGRESS') {
      this.onProgress?.(msg.progress);
      return; // progress messages don't resolve a pending operation
    }

    const pending = this.pendingOperations.get(id);
    if (!pending) return;

    this.pendingOperations.delete(id);

    if (type === 'ERROR') {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg);
    }
  }

  private sendToWorker<T>(message: WorkerInbound): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pendingOperations.set(message.id, { resolve, reject });
      this.getWorker().postMessage(message);
    });
  }
```

### 2. Replace `initialize()` body (the probe + remux part)

```typescript
// OLD — runs on main thread:
const ffmpeg = await getFFmpeg();
await ffmpeg.writeFile(...);
// ...

// NEW — sends to worker:
const opId = crypto.randomUUID();
const result = await this.sendToWorker<{ type: 'REMUX_DONE'; data: Uint8Array; logs: string }>({
  id: opId,
  type: 'REMUX',
  payload: {
    file: this.file,
    fileName: this.file.name,
    audioTrackIndex: 0,
  },
});

const { audioTracks, subtitleTracks } = parseStreamInfo(result.logs);
// ... rest of initialize() stays the same ...

// Create blob URL from the transferred Uint8Array
const blob = new Blob([result.data], { type: 'video/mp4' });
const url = URL.createObjectURL(blob);
```

### 3. Replace `_remux()` body

```typescript
private async _remux(audioTrackIndex: number): Promise<string> {
  const opId = crypto.randomUUID();
  const result = await this.sendToWorker<{ type: 'REMUX_DONE'; data: Uint8Array; logs: string }>({
    id: opId,
    type: 'REMUX',
    payload: {
      file: this.file,
      fileName: this.file.name,
      audioTrackIndex,
    },
  });

  const blob = new Blob([result.data], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);

  if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  this.objectUrl = url;
  return url;
}
```

### 4. Update `destroy()`

```typescript
destroy(): void {
  // Terminate the worker so the FFmpeg WASM thread is killed
  if (this.worker) {
    this.worker.terminate();
    this.worker = null;
  }
  this.pendingOperations.clear();

  if (this.objectUrl) {
    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
  for (const url of this.subtitleBlobUrls.values()) {
    URL.revokeObjectURL(url);
  }
  this.subtitleBlobUrls.clear();
}
```

---

## Subtitle Extraction via Worker

The existing `_extractSubtitle()` method in `MKVPlayer` also calls FFmpeg on the main
thread. It must be moved to the worker too.

**In `_handleWorkerMessage()`**, handle the new message type:

```typescript
} else if (type === 'EXTRACT_SUBTITLE_DONE') {
  pending.resolve(msg); // { type: 'EXTRACT_SUBTITLE_DONE', srtText: string }
}
```

**Replace `_extractSubtitle()` body:**

```typescript
private async _extractSubtitle(trackIndex: number): Promise<string> {
  const opId = crypto.randomUUID();
  const result = await this.sendToWorker<{ type: 'EXTRACT_SUBTITLE_DONE'; srtText: string }>({
    id: opId,
    type: 'EXTRACT_SUBTITLE',
    payload: {
      file: this.file,
      fileName: this.file.name,
      trackIndex,
    },
  });
  return result.srtText;
}
```

No changes to `switchSubtitle()` — it already calls `_extractSubtitle()` and passes the
result to `SubtitleConverter`. The only change is that `_extractSubtitle` no longer imports
`getFFmpeg` directly.

---

## How Progress Flows (End-to-End)

```
FFmpeg WASM (worker thread)
   │  fires 'progress' event with { progress: 0.0 ... 1.0 }
   │
   ▼
ffmpeg-worker.ts :: progressHandler
   │  self.postMessage({ id, type: 'PROGRESS', progress: 0.42 })
   │
   ▼  [Worker → Main thread boundary — structured clone]
   │
   ▼
MKVPlayer._handleWorkerMessage()
   │  msg.type === 'PROGRESS' → this.onProgress?.(0.42)
   │
   ▼
MKVPlayer.onProgress callback
   │  (set in constructor, passed from lightbird-player.tsx)
   │
   ▼
lightbird-player.tsx :: setProcessingProgress(0.42)
   │
   ▼
React re-render → VideoOverlay shows "42%"
```

---

## `next.config.ts` Check

Before implementing, verify these are present in `next.config.ts`:

```typescript
// Required for SharedArrayBuffer (FFmpeg uses it internally)
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      ],
    },
  ];
},
// Required for Worker bundling
webpack(config) {
  config.output.globalObject = 'self'; // must be 'self', not 'window'
  return config;
},
```

> If `globalObject` is `'window'` the Worker will fail immediately with
> `ReferenceError: window is not defined`.

---

## Tests to Add in `src/lib/__tests__/mkv-player.test.ts`

```typescript
describe('MKVPlayer worker integration', () => {
  it('posts REMUX message to worker on initialize', async () => {
    // Mock Worker
    const postMessage = jest.fn();
    const mockWorker = { postMessage, onmessage: null, onerror: null, terminate: jest.fn() };
    jest.spyOn(global, 'Worker').mockImplementation(() => mockWorker as unknown as Worker);

    const player = new MKVPlayer(mockFile);
    // Kick off initialize (don't await — we'll resolve manually)
    const initPromise = player.initialize(mockVideoElement);

    // Worker should have received a REMUX message
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'REMUX' }));

    // Simulate worker response
    const msg = postMessage.mock.calls[0][0];
    mockWorker.onmessage?.({
      data: {
        id: msg.id,
        type: 'REMUX_DONE',
        data: new Uint8Array([0, 1, 2]),
        logs: 'Stream #0:0: Video: h264\nStream #0:1: Audio: aac',
      },
    });

    await initPromise;
    expect(player.getAudioTracks()).toHaveLength(1);
  });

  it('forwards PROGRESS messages to onProgress callback', () => {
    const onProgress = jest.fn();
    const player = new MKVPlayer(mockFile, onProgress);

    // Simulate a PROGRESS message arriving
    (player as unknown as { _handleWorkerMessage: Function })._handleWorkerMessage({
      id: 'any',
      type: 'PROGRESS',
      progress: 0.5,
    });

    expect(onProgress).toHaveBeenCalledWith(0.5);
  });

  it('calls worker.terminate() on destroy()', () => {
    const terminate = jest.fn();
    const mockWorker = { postMessage: jest.fn(), terminate, onmessage: null, onerror: null };
    jest.spyOn(global, 'Worker').mockImplementation(() => mockWorker as unknown as Worker);

    const player = new MKVPlayer(mockFile);
    player['getWorker'](); // trigger lazy creation
    player.destroy();

    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
```

---

## Acceptance Criteria

- [ ] `ffmpeg-worker.ts` exists and exports `WorkerInbound` / `WorkerOutbound` types.
- [ ] `MKVPlayer` creates a Worker lazily (only when first MKV file is loaded).
- [ ] Progress events from the worker reach the `onProgress` callback in `lightbird-player.tsx`.
- [ ] Calling `player.destroy()` calls `worker.terminate()`.
- [ ] The main thread does **not** call `getFFmpeg()` or `ffmpeg.exec()` directly — this includes `_extractSubtitle()`.
- [ ] All existing tests still pass (`npm test`).
- [ ] Loading a large MKV file no longer freezes the browser tab.
