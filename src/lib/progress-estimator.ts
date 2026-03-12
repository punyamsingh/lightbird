/**
 * Estimates remux speed and ETA from a stream of progress values [0, 1].
 *
 * startTime is initialized lazily on the first update() call with progress > 0
 * to avoid capturing bootstrap latency from the constructor.
 *
 * Usage:
 *   const est = new ProgressEstimator(fileSizeBytes);
 *   est.update(0.42); // call on each progress event
 *   const { speedMBps, etaSeconds } = est.getEstimate();
 */
export class ProgressEstimator {
  private readonly fileSizeBytes: number;
  private startTime: number | null = null; // set lazily on first real progress
  private lastProgress = 0;

  constructor(fileSizeBytes: number) {
    this.fileSizeBytes = fileSizeBytes;
  }

  update(progress: number): void {
    if (progress > 0 && this.startTime === null) {
      this.startTime = Date.now(); // initialize on first real progress event
    }
    this.lastProgress = progress;
  }

  getEstimate(): { speedMBps: number; etaSeconds: number | null } {
    if (this.startTime === null || this.lastProgress <= 0) {
      return { speedMBps: 0, etaSeconds: null };
    }

    const elapsedMs = Date.now() - this.startTime;
    if (elapsedMs < 500) {
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
  // No reset() method — create a new instance per file load instead.
}
