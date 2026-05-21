import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { getConfig } from '../config';

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

const defaultCDN = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

/**
 * Returns a lazily-initialised FFmpeg.wasm instance.
 *
 * `@ffmpeg/ffmpeg` and `@ffmpeg/util` are pulled in via dynamic `import()` so
 * the multi-MB FFmpeg code path is never part of the base `@lightbird/core`
 * entry chunk. Consumers that only play HTML5-native formats (MP4/WebM) and
 * never call `getFFmpeg()` download zero FFmpeg code. See issue #54.
 */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (loading) return loading;

  loading = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ]);
    const ffmpeg = new FFmpeg();
    const baseURL = getConfig().ffmpegCDN || defaultCDN;
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    instance = ffmpeg;
    return ffmpeg;
  })();

  return loading;
}

export function resetFFmpeg(): void {
  instance = null;
  loading = null;
}
