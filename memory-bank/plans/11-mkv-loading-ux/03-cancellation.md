# Sub-plan 03 — Cancel Button for MKV Remux

## Status: DONE

## Depends On

Sub-plan 01 (Web Worker). Cancellation works by calling `worker.terminate()`. Without the
worker, there is no way to interrupt a blocking `ffmpeg.exec()` call.

---

## Problem

Once the user drops an MKV file, they cannot stop the remux. If they accidentally loaded
the wrong file or changed their mind, they must wait (potentially minutes) for FFmpeg to
finish before they can do anything.

---

## Goal

Show a **Cancel** button in the loading overlay. Clicking it terminates the worker, reverts
the UI, and returns to the idle state.

---

## How Worker Termination Works

`Worker.terminate()` immediately kills the worker thread. There is no graceful shutdown.
Any in-flight promise in `MKVPlayer.pendingOperations` will never resolve or reject — the
`Map` entry will leak. We must reject all pending operations on termination.

---

## Changes to `MKVPlayer`

### 0. Add `CancellationError` sentinel class (new file or top of `mkv-player.ts`)

```typescript
// Dedicated sentinel — use instanceof check, not string matching
export class CancellationError extends Error {
  constructor() {
    super('MKVPlayer: operation cancelled');
    this.name = 'CancellationError';
  }
}
```

### 1. Add a public `cancel()` method

```typescript
cancel(): void {
  if (!this.worker) return;

  // Terminate the worker immediately
  this.worker.terminate();
  this.worker = null;

  // Reject all pending operations with the CancellationError sentinel
  for (const { reject } of this.pendingOperations.values()) {
    reject(new CancellationError());
  }
  this.pendingOperations.clear();
}
```

### 2. `VideoPlayer` interface: add optional `cancel()`

In `src/lib/video-processor.ts`, add only `cancel?()` — do not change any existing signatures.
The current `initialize()` return type is `Promise<ProcessedFile>` and must stay that way:

```typescript
export interface VideoPlayer {
  initialize(videoElement: HTMLVideoElement): Promise<ProcessedFile>; // unchanged
  getAudioTracks(): AudioTrack[];
  getSubtitles(): Subtitle[];
  switchAudioTrack(trackId: string): Promise<void>;
  switchSubtitle(trackId: string): Promise<void>;
  destroy(): void;
  cancel?(): void; // ADD THIS — optional, only MKVPlayer implements it
}
```

`ProcessedFile` is already exported from `video-processor.ts` as `type ProcessedFile = SimplePlayerFile | MKVPlayerFile`.

---

## Changes to `lightbird-player.tsx`

### 1. Add a `cancellableProcessing` state and cancel handler

```typescript
// New state: true from the moment the player is created until initialize() settles
const [cancellableProcessing, setCancellableProcessing] = useState(false);

const handleCancelProcessing = useCallback(() => {
  playerRef.current?.cancel?.();
  playerRef.current = null;
  setCancellableProcessing(false);
  setIsLoading(false);
  setLoadingMessage('');
  setProcessingProgress(0);
}, []);
```

Set `cancellableProcessing = true` in `processFile()` **after** the player is created but **before** `initialize()` is awaited, and clear it in the `finally` block:

```typescript
const player = createVideoPlayer(file, subtitleFiles, ...);
playerRef.current = player;
setCancellableProcessing(true); // cancel button now available
try {
  await player.initialize(videoRef.current!);
} finally {
  setCancellableProcessing(false);
}
```

### 2. Pass it to `VideoOverlay`

```tsx
<VideoOverlay
  isLoading={isLoading}
  loadingMessage={loadingMessage}
  processingProgress={processingProgress}
  onCancel={cancellableProcessing ? handleCancelProcessing : undefined}
/>
```

> `onCancel` is now available from the start of `initialize()` through to completion,
> including the "Initializing player…" phase. The Cancel button appears for the
> full duration of the async operation.

---

## Changes to `VideoOverlay` Component

The overlay is at `src/components/video-overlay.tsx`. Add an optional `onCancel` prop:

```typescript
interface VideoOverlayProps {
  isLoading: boolean;
  loadingMessage: string;
  processingProgress: number;
  onCancel?: () => void; // NEW
}
```

In the JSX, add a Cancel button when `onCancel` is defined:

```tsx
{onCancel && (
  <button
    onClick={onCancel}
    className="mt-3 px-4 py-1.5 text-sm rounded border border-white/30 text-white/80 hover:bg-white/10 transition-colors"
  >
    Cancel
  </button>
)}
```

---

## Error Handling in `processFile()`

The `cancel()` call causes `player.initialize()` to reject with a `CancellationError`.
Use `instanceof` — not a string check — to suppress the toast for intentional cancellations:

```typescript
import { CancellationError } from '@/lib/players/mkv-player';

} catch (error) {
  if (!(error instanceof CancellationError)) {
    toast({
      title: 'Failed to process video',
      description: 'There was an error loading the video file.',
      variant: 'destructive',
    });
  }
  // setIsLoading etc. are handled by the finally block (see sub-plan 02)
}
```

---

## Tests to Add in `src/lib/__tests__/mkv-player.test.ts`

```typescript
describe('MKVPlayer cancellation', () => {
  it('terminates worker and rejects with CancellationError on cancel()', async () => {
    const terminate = jest.fn();
    const mockWorker = {
      postMessage: jest.fn(),
      terminate,
      onmessage: null,
      onerror: null,
    };
    jest.spyOn(global, 'Worker').mockImplementation(() => mockWorker as unknown as Worker);

    const player = new MKVPlayer(mockFile);
    // Start initialize (don't await — cancel before it resolves)
    const initPromise = player.initialize(mockVideoElement);

    player.cancel();

    // Must reject with CancellationError specifically (not just any error)
    await expect(initPromise).rejects.toBeInstanceOf(CancellationError);
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('clears pendingOperations after cancel()', async () => {
    const postMessage = jest.fn();
    const mockWorker = { postMessage, terminate: jest.fn(), onmessage: null, onerror: null };
    jest.spyOn(global, 'Worker').mockImplementation(() => mockWorker as unknown as Worker);

    const player = new MKVPlayer(mockFile);
    // Trigger worker creation via public API
    player.initialize(mockVideoElement).catch(() => {});

    player.cancel();

    expect(player['pendingOperations'].size).toBe(0);
  });
});
```

---

## Acceptance Criteria

- [ ] `CancellationError` class is exported from `mkv-player.ts`.
- [ ] `MKVPlayer.cancel()` exists, terminates the worker, and rejects pending ops with `CancellationError`.
- [ ] `instanceof CancellationError` (not string matching) is used to detect cancellation.
- [ ] `cancellableProcessing` state gates the cancel button — visible from start of `initialize()`, not just when `processingProgress > 0`.
- [ ] Cancelling does not show the error toast.
- [ ] After cancelling, the UI returns to the idle/empty state.
- [ ] All new tests pass.
