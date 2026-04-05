import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { getConfig } from '../config';

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

const defaultCDN = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

export async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (loading) return loading;

  loading = (async () => {
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
