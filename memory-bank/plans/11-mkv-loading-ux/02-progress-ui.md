# Sub-plan 02 — Progress UI with Speed and ETA

## Status: PENDING

## Depends On

Sub-plan 01 (Web Worker). Progress now comes from worker `PROGRESS` messages rather than
direct FFmpeg events. The wiring in `lightbird-player.tsx` (`setProcessingProgress`) is
already correct — this plan only adds enrichment on top.

---

## Problem

The current progress overlay shows only `"Processing video… 42%"`. The user has no idea:
- How fast the remux is running (MB/s throughput).
- How long it will take to finish.

---

## Goal

Show `"Processing… 42% · 2.3 MB/s · ~12s left"`.

---

## New Class: `src/lib/progress-estimator.ts`

```typescript
/**
 * Estimates remux speed and ETA from a stream of progress values [0, 1].
 *
 * Usage:
 *   const est = new ProgressEstimator(fileSizeBytes);
 *   est.update(0.42); // call on each progress event
 *   const { speedMBps, etaSeconds } = est.getEstimate();
 */
export class ProgressEstimator {
  private readonly fileSizeBytes: number;
  private readonly startTime: number;
  private lastProgress = 0;

  constructor(fileSizeBytes: number) {
    this.fileSizeBytes = fileSizeBytes;
    this.startTime = Date.now();
  }

  update(progress: number): void {
    this.lastProgress = progress;
  }

  getEstimate(): { speedMBps: number; etaSeconds: number | null } {
    const elapsedMs = Date.now() - this.startTime;
    if (elapsedMs < 500 || this.lastProgress <= 0) {
      return { speedMBps: 0, etaSeconds: null };
    }

    const elapsedSeconds = elapsedMs / 1000;
    // Bytes processed so far (approximation: progress fraction of file size)
    const bytesProcessed = this.fileSizeBytes * this.lastProgress;
    const speedMBps = bytesProcessed / elapsedSeconds / (1024 * 1024);

    // Remaining bytes / current speed
    const bytesRemaining = this.fileSizeBytes * (1 - this.lastProgress);
    const etaSeconds =
      speedMBps > 0 ? bytesRemaining / (speedMBps * 1024 * 1024) : null;

    return {
      speedMBps: Math.round(speedMBps * 10) / 10, // 1 decimal place
      etaSeconds: etaSeconds !== null ? Math.round(etaSeconds) : null,
    };
  }

  reset(): void {
    this.lastProgress = 0;
    // Note: startTime is set in constructor — create a new instance to reset
  }
}
```

---

## Integration in `lightbird-player.tsx`

### 1. New state fields

```typescript
import { ProgressEstimator } from '@/lib/progress-estimator';

const progressEstimatorRef = useRef<ProgressEstimator | null>(null);
const [processingEta, setProcessingEta] = useState<number | null>(null);
const [processingThroughput, setProcessingThroughput] = useState<number | null>(null);
```

### 2. Create the estimator when a file starts loading

```typescript
// In processFile(), after setProcessingProgress(0):
progressEstimatorRef.current = new ProgressEstimator(file.size);
setProcessingEta(null);
setProcessingThroughput(null);
```

### 3. Update the progress callback to feed the estimator

```typescript
const player = createVideoPlayer(file, subtitleFiles, (progress) => {
  progressEstimatorRef.current?.update(progress);
  const est = progressEstimatorRef.current?.getEstimate();

  setProcessingProgress(progress);
  if (progress < 1) {
    setLoadingMessage(`Processing video… ${Math.round(progress * 100)}%`);
    setProcessingEta(est?.etaSeconds ?? null);
    setProcessingThroughput(est && est.speedMBps > 0 ? est.speedMBps : null);
  }
});
```

### 4. Pass to `VideoOverlay`

```tsx
<VideoOverlay
  isLoading={isLoading}
  loadingMessage={loadingMessage}
  processingProgress={processingProgress}
  eta={processingEta}
  throughputMBs={processingThroughput}
/>
```

### 5. Clean up on finish / cancel

```typescript
// At the end of processFile() success or catch block:
progressEstimatorRef.current = null;
setProcessingEta(null);
setProcessingThroughput(null);
```

---

## Changes to `VideoOverlay`

Add two optional props to `src/components/video-overlay.tsx`:

```typescript
interface VideoOverlayProps {
  isLoading: boolean;
  loadingMessage: string;
  processingProgress?: number;
  eta?: number | null;        // seconds remaining (null = not yet calculable)
  throughputMBs?: number | null; // MB/s (null = not yet calculable)
}
```

Render them beneath the existing progress bar:

```tsx
{processingProgress > 0 && processingProgress < 1 && (
  <>
    <div className="mt-4 w-64 bg-gray-700 rounded-full h-2">
      <div
        className="bg-primary h-2 rounded-full transition-all duration-300"
        style={{ width: `${Math.round(processingProgress * 100)}%` }}
      />
    </div>
    {(throughputMBs !== null && throughputMBs !== undefined) && (
      <p className="mt-1 text-sm text-white/60">
        {throughputMBs} MB/s
        {eta !== null && eta !== undefined && ` · ~${eta}s left`}
      </p>
    )}
  </>
)}
```

---

## Tests: `src/lib/__tests__/progress-estimator.test.ts`

```typescript
import { ProgressEstimator } from '@/lib/progress-estimator';

describe('ProgressEstimator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns zero speed before 500ms have elapsed', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024); // 100 MB
    jest.advanceTimersByTime(200);
    est.update(0.3);
    expect(est.getEstimate().speedMBps).toBe(0);
  });

  it('calculates speed correctly after 1 second', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024); // 100 MB
    jest.advanceTimersByTime(1000);
    est.update(0.1); // 10% in 1s = 10 MB/s
    const { speedMBps } = est.getEstimate();
    expect(speedMBps).toBeCloseTo(10, 0);
  });

  it('returns null ETA when progress is 0', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024);
    jest.advanceTimersByTime(2000);
    est.update(0);
    expect(est.getEstimate().etaSeconds).toBeNull();
  });

  it('returns decreasing ETA as progress increases', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024);
    jest.advanceTimersByTime(1000);
    est.update(0.1);
    const eta1 = est.getEstimate().etaSeconds!;

    jest.advanceTimersByTime(1000);
    est.update(0.2);
    const eta2 = est.getEstimate().etaSeconds!;

    expect(eta2).toBeLessThan(eta1);
  });
});
```

---

## Acceptance Criteria

- [ ] `ProgressEstimator` class exists at `src/lib/progress-estimator.ts`.
- [ ] `lightbird-player.tsx` creates an estimator instance per file load.
- [ ] `VideoOverlay` accepts `eta?: number | null` and `throughputMBs?: number | null` props.
- [ ] `VideoOverlay` renders MB/s and ETA text beneath the progress bar when both are non-null.
- [ ] Fields are omitted (null) and not rendered when not yet calculable (first 500ms).
- [ ] The `loadingMessage` string does NOT contain speed/ETA text — those are separate props.
- [ ] All new tests pass.
