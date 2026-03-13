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

// ─── Serial Queue ─────────────────────────────────────────────────────────────
// Serialize all operations against the shared FFmpeg instance so that
// concurrent messages don't interleave FS paths, event handlers, or ff.exec().

let processingChain: Promise<void> = Promise.resolve();

// ─── Message Handler ─────────────────────────────────────────────────────────

async function handleMessage(event: MessageEvent<WorkerInbound>): Promise<void> {
  const { id, type, payload } = event.data;

  try {
    const ff = await getWorkerFFmpeg();

    if (type === 'PROBE') {
      const logs: string[] = [];
      const logHandler = ({ message }: { message: string }) => logs.push(message);
      ff.on('log', logHandler);
      try {
        await ff.writeFile(payload.fileName, await fetchFile(payload.file));
        try {
          await ff.exec(['-i', payload.fileName, '-f', 'null', '-']);
        } catch {
          // FFmpeg exits non-zero when output is /dev/null — expected
        }
        self.postMessage({ id, type: 'PROBE_DONE', logs: logs.join('\n') } satisfies WorkerOutbound);
      } finally {
        ff.off('log', logHandler);
        try { await ff.deleteFile(payload.fileName); } catch { /* ignore */ }
      }

    } else if (type === 'EXTRACT_SUBTITLE') {
      const outputName = `subtitle_${payload.trackIndex}_${Date.now()}.srt`;
      try {
        await ff.writeFile(payload.fileName, await fetchFile(payload.file));
        await ff.exec([
          '-i', payload.fileName,
          '-map', `0:s:${payload.trackIndex}`,
          outputName,
        ]);
        const data = await ff.readFile(outputName) as Uint8Array;
        const srtText = new TextDecoder().decode(data);
        self.postMessage({ id, type: 'EXTRACT_SUBTITLE_DONE', srtText } satisfies WorkerOutbound);
      } finally {
        try { await ff.deleteFile(outputName); } catch { /* ignore */ }
        try { await ff.deleteFile(payload.fileName); } catch { /* ignore */ }
      }

    } else if (type === 'REMUX') {
      const progressHandler = ({ progress }: { progress: number }) => {
        self.postMessage({
          id,
          type: 'PROGRESS',
          progress: Math.max(0, Math.min(0.99, progress)),
        } satisfies WorkerOutbound);
      };
      ff.on('progress', progressHandler);

      let outputName: string | null = null;
      const logs: string[] = [];
      const logHandler = ({ message }: { message: string }) => logs.push(message);
      ff.on('log', logHandler);

      try {
        await ff.writeFile(payload.fileName, await fetchFile(payload.file));

        try {
          await ff.exec(['-i', payload.fileName, '-f', 'null', '-']);
        } catch { /* expected */ }

        outputName = `output_${Date.now()}.mp4`;
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

        // Transfer the buffer (zero-copy) back to main thread
        self.postMessage(
          { id, type: 'REMUX_DONE', data, logs: logs.join('\n') } satisfies WorkerOutbound,
          [data.buffer],
        );

      } finally {
        ff.off('progress', progressHandler);
        ff.off('log', logHandler);
        if (outputName) { try { await ff.deleteFile(outputName); } catch { /* ignore */ } }
        try { await ff.deleteFile(payload.fileName); } catch { /* ignore */ }
      }
    }

  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    } satisfies WorkerOutbound);
  }
}

self.onmessage = (event: MessageEvent<WorkerInbound>) => {
  processingChain = processingChain
    .then(() => handleMessage(event))
    .catch(() => {}); // errors are reported as ERROR messages inside handleMessage
};
