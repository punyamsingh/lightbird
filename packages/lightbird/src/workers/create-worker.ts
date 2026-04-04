/**
 * Creates the FFmpeg Web Worker. Isolated into its own file so tests can
 * mock it without needing to parse `import.meta.url`.
 */
export function createFFmpegWorker(): Worker {
  return new Worker(
    new URL('./ffmpeg-worker.ts', import.meta.url),
  );
}
