# Sub-plan 03 — Cancel Button for MKV Remux

## Status: PENDING

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

### 1. Add a public `cancel()` method

```typescript
cancel(): void {
  if (!this.worker) return;

  // Terminate the worker immediately
  this.worker.terminate();
  this.worker = null;

  // Reject all pending operations
  for (const { reject } of this.pendingOperations.values()) {
    reject(new Error('MKVPlayer: operation cancelled'));
  }
  this.pendingOperations.clear();
}
```

### 2. `VideoPlayer` interface: add optional `cancel()`

In `src/lib/video-processor.ts` (the `VideoPlayer` interface):

```typescript
export interface VideoPlayer {
  initialize(videoElement: HTMLVideoElement): Promise<unknown>;
  getAudioTracks(): AudioTrack[];
  getSubtitles(): Subtitle[];
  switchAudioTrack(trackId: string): Promise<void>;
  switchSubtitle(trackId: string): Promise<void>;
  getActiveAudioTrack(): string;
  getActiveSubtitleTrack(): string;
  destroy(): void;
  cancel?(): void; // optional — only implemented by MKVPlayer
}
```

---

## Changes to `lightbird-player.tsx`

### 1. Add a cancel handler

```typescript
const handleCancelProcessing = useCallback(() => {
  playerRef.current?.cancel?.();
  playerRef.current = null;
  setIsLoading(false);
  setLoadingMessage('');
  setProcessingProgress(0);
}, []);
```

### 2. Pass it to `VideoOverlay`

```tsx
<VideoOverlay
  isLoading={isLoading}
  loadingMessage={loadingMessage}
  processingProgress={processingProgress}
  onCancel={processingProgress > 0 && processingProgress < 1 ? handleCancelProcessing : undefined}
/>
```

> `onCancel` is only defined while actively remuxing (`0 < progress < 1`).
> This hides the button during the initial "Initializing player..." phase.

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

The `cancel()` call causes the `player.initialize()` promise to reject with
`"operation cancelled"`. The existing `catch` block in `processFile()` will fire and show
a toast. We need to suppress the toast for intentional cancellations:

```typescript
} catch (error) {
  const isCancelled =
    error instanceof Error && error.message.includes('cancelled');

  if (!isCancelled) {
    toast({
      title: 'Failed to process video',
      description: 'There was an error loading the video file.',
      variant: 'destructive',
    });
  }

  setIsLoading(false);
  setLoadingMessage('');
  setProcessingProgress(0);
}
```

---

## Tests to Add in `src/lib/__tests__/mkv-player.test.ts`

```typescript
describe('MKVPlayer cancellation', () => {
  it('terminates worker and rejects pending operation on cancel()', async () => {
    const terminate = jest.fn();
    const mockWorker = {
      postMessage: jest.fn(),
      terminate,
      onmessage: null,
      onerror: null,
    };
    jest.spyOn(global, 'Worker').mockImplementation(() => mockWorker as unknown as Worker);

    const player = new MKVPlayer(mockFile);
    // Start an operation without resolving it
    const initPromise = player.initialize(mockVideoElement);

    // Cancel immediately
    player.cancel();

    await expect(initPromise).rejects.toThrow('cancelled');
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('clears pendingOperations after cancel()', () => {
    const player = new MKVPlayer(mockFile);
    player['getWorker'](); // create worker
    // Manually add a fake pending op
    player['pendingOperations'].set('fake-id', {
      resolve: jest.fn(),
      reject: jest.fn(),
    });

    player.cancel();

    expect(player['pendingOperations'].size).toBe(0);
  });
});
```

---

## Acceptance Criteria

- [ ] `MKVPlayer.cancel()` exists and terminates the worker.
- [ ] All pending promises reject with `"operation cancelled"` when cancelled.
- [ ] The Cancel button appears in the loading overlay only while `0 < progress < 1`.
- [ ] Cancelling does not show the error toast.
- [ ] After cancelling, the UI returns to the idle/empty state.
- [ ] All new tests pass.
