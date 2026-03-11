# Plan 05 — Robust Error Handling & Recovery [DONE]

## Implementation Summary (2026-03-11)

All steps implemented and tests passing (142 tests).

- **`src/lib/media-error.ts`** — `parseMediaError` maps HTML5 `MediaError` codes (1–4) to `ParsedMediaError` with `type`, `message`, `recoverable`, `retryable`. `validateFile` checks extension and size (≤10 GB).
- **`src/components/player-error-display.tsx`** — overlay component with AlertCircle icon, error message, and conditional Retry / Skip to Next / Dismiss buttons.
- **`src/components/player-error-boundary.tsx`** — React class-based Error Boundary; catches render exceptions and shows a "Try again" fallback.
- **`src/components/lightbird-player.tsx`** — wired `error` event listener with auto-retry (exponential backoff, max 3 retries); auto-skip on unrecoverable errors; stall detection for streams (checks every 5 s, reloads from last position); file validation before load.
- **`src/app/page.tsx`** — wrapped `<LightBirdPlayer>` with `<PlayerErrorBoundary>`.
- **Tests** — `src/lib/__tests__/media-error.test.ts`, `src/components/__tests__/player-error-display.test.tsx`, `src/components/__tests__/player-error-boundary.test.tsx`.

---

## Problem

The current error handling is minimal:

- Video load failures show a toast but leave the player in a broken/stuck state with no retry mechanism.
- Network streams can drop silently — there is no reconnect logic.
- FFmpeg operations (current placeholder, future real) have no timeout or error boundary.
- The `<video>` element's native `error` event is not fully handled (no distinction between network errors, decode errors, and format-not-supported errors).
- The UI has no dedicated error state — if a video fails, the player looks the same as if it were still loading.
- Large file handling is not validated before load (e.g. a 50 GB file attempted via file picker).

## Goal

- Distinguish error types and show actionable messages.
- Add retry capability for network streams.
- Recover gracefully by automatically skipping to the next playlist item on unrecoverable errors.
- Provide a visible error state in the UI with clear recovery options.
- Validate files before attempting to load.

---

## Step-by-Step Implementation

### Step 1 — Map HTML5 MediaError Codes to Readable Messages

The `HTMLMediaElement.error` object has a numeric `code`:

| Code | Constant | Meaning |
|---|---|---|
| 1 | MEDIA_ERR_ABORTED | User or script aborted playback |
| 2 | MEDIA_ERR_NETWORK | Network error while loading |
| 3 | MEDIA_ERR_DECODE | Decoding error |
| 4 | MEDIA_ERR_SRC_NOT_SUPPORTED | Format or codec not supported |

Create `src/lib/media-error.ts`:

```ts
export type MediaErrorType = 'aborted' | 'network' | 'decode' | 'unsupported' | 'unknown';

export interface ParsedMediaError {
  type: MediaErrorType;
  message: string;
  recoverable: boolean;
  retryable: boolean;
}

export function parseMediaError(error: MediaError | null): ParsedMediaError {
  if (!error) return { type: 'unknown', message: 'An unknown error occurred.', recoverable: true, retryable: true };

  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return { type: 'aborted', message: 'Playback was aborted.', recoverable: true, retryable: false };
    case MediaError.MEDIA_ERR_NETWORK:
      return { type: 'network', message: 'A network error interrupted loading. Check your connection.', recoverable: true, retryable: true };
    case MediaError.MEDIA_ERR_DECODE:
      return { type: 'decode', message: 'The video could not be decoded. It may be corrupted.', recoverable: false, retryable: false };
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return { type: 'unsupported', message: 'This format is not supported by your browser.', recoverable: false, retryable: false };
    default:
      return { type: 'unknown', message: error.message || 'An unexpected error occurred.', recoverable: true, retryable: true };
  }
}
```

### Step 2 — Add Error State to Player

In `LightBirdPlayer` (or `useVideoPlayback` hook from Plan 03):

```ts
const [playerError, setPlayerError] = useState<ParsedMediaError | null>(null);
const [retryCount, setRetryCount] = useState(0);
const MAX_RETRIES = 3;
```

Handle the `error` event on the video element:

```ts
const onError = () => {
  const parsed = parseMediaError(videoRef.current?.error ?? null);
  setPlayerError(parsed);

  if (parsed.retryable && retryCount < MAX_RETRIES) {
    // Auto-retry with exponential backoff
    const delay = Math.pow(2, retryCount) * 1000;
    setTimeout(() => {
      setRetryCount(c => c + 1);
      videoRef.current!.load(); // triggers reload
    }, delay);
  } else if (!parsed.recoverable) {
    // Auto-skip to next item
    toast({ title: 'Skipping unplayable file', description: parsed.message });
    playlist.nextItem();
  }
};
```

### Step 3 — Build `PlayerErrorDisplay` Component

Path: `src/components/player-error-display.tsx`

An overlay shown instead of the video when there is an active error:

```tsx
export function PlayerErrorDisplay({ error, onRetry, onSkip, onDismiss }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-white text-lg font-semibold mb-2">Playback Error</h3>
      <p className="text-gray-300 text-sm text-center max-w-xs mb-6">{error.message}</p>
      <div className="flex gap-3">
        {error.retryable && <Button onClick={onRetry} variant="outline">Retry</Button>}
        <Button onClick={onSkip} variant="outline">Skip to Next</Button>
        <Button onClick={onDismiss}>Dismiss</Button>
      </div>
    </div>
  );
}
```

### Step 4 — Stream Reconnect Logic

For stream URLs (HLS, direct RTSP proxied to HTTP), implement an auto-reconnect mechanism:

```ts
const streamStallDetector = useRef<ReturnType<typeof setInterval> | null>(null);

function startStallDetection() {
  let lastTime = -1;
  streamStallDetector.current = setInterval(() => {
    const current = videoRef.current?.currentTime ?? 0;
    if (!videoRef.current?.paused && current === lastTime) {
      // Stream appears stalled — attempt reload from current position
      const resumeAt = current;
      videoRef.current!.load();
      videoRef.current!.addEventListener('canplay', () => {
        videoRef.current!.currentTime = resumeAt;
        videoRef.current!.play();
      }, { once: true });
    }
    lastTime = current;
  }, 5000); // check every 5 seconds
}

function stopStallDetection() {
  if (streamStallDetector.current) clearInterval(streamStallDetector.current);
}
```

Activate `startStallDetection()` when a stream URL is loaded; deactivate on file change or unmount.

### Step 5 — File Validation Before Load

Before attempting to load a dropped or selected file, validate basic properties:

```ts
function validateFile(file: File): { valid: boolean; reason?: string } {
  const MAX_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
  const SUPPORTED = ['mp4','webm','mkv','mov','avi','wmv','flv','m4v','ogv'];

  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, reason: `File is too large (${(file.size / 1e9).toFixed(1)} GB). Maximum is 10 GB.` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !SUPPORTED.includes(ext)) {
    return { valid: false, reason: `"${ext}" is not a supported video format.` };
  }

  return { valid: true };
}
```

Show a toast with the reason if `valid` is false.

### Step 6 — Error Boundary for the Entire Player

Wrap `LightBirdPlayer` in a React Error Boundary to catch unexpected render errors:

```tsx
// src/components/player-error-boundary.tsx
import { Component, ReactNode } from 'react';

export class PlayerErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LightBird] Render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-black text-white">
          <p>Something went wrong with the player. <button onClick={() => this.setState({ hasError: false })}>Try again</button></p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap in `src/app/page.tsx`:

```tsx
<PlayerErrorBoundary>
  <LightBirdPlayer />
</PlayerErrorBoundary>
```

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Create | `src/lib/media-error.ts` |
| Create | `src/components/player-error-display.tsx` |
| Create | `src/components/player-error-boundary.tsx` |
| Modify | `src/components/lightbird-player.tsx` (wire error handling, stall detection, validation) |
| Modify | `src/app/page.tsx` (wrap with error boundary) |

---

## Success Criteria

- Dropping an unsupported file type shows an immediate, specific toast with the reason.
- Opening a valid but broken video shows the `PlayerErrorDisplay` overlay with a Retry button.
- Network errors auto-retry up to 3 times with exponential backoff.
- Unrecoverable errors auto-skip to the next playlist item with a notification.
- A stalled stream reconnects automatically within 5–10 seconds.
- The app never crashes to a white screen — the error boundary catches all render exceptions.
