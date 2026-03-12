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
      const progressHandler = ({ progress }: { progress: number }) => {
        self.postMessage({
          id,
          type: 'PROGRESS',
          progress: Math.max(0, Math.min(0.99, progress)),
        } satisfies WorkerOutbound);
      };
      ff.on('progress', progressHandler);

      try {
        const logs: string[] = [];
        const logHandler = ({ message }: { message: string }) => logs.push(message);
        ff.on('log', logHandler);

        await ff.writeFile(payload.fileName, await fetchFile(payload.file));

        try {
          await ff.exec(['-i', payload.fileName, '-f', 'null', '-']);
        } catch { /* expected */ }
        ff.off('log', logHandler);

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
