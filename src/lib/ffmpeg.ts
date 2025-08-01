import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export interface FfmpegStream {
    codec_long_name: string;
    codec_name: string;
    index: number;
    codec_type: 'video' | 'audio' | 'subtitle';
    tags?: {
        language?: string;
        title?: string;
    };
    channel_layout?: string;
}

export interface FfmpegFile {
    name: string;
    streams: {
        video: FfmpegStream[];
        audio: FfmpegStream[];
        subtitles: FfmpegStream[];
    };
}


export async function initFFmpeg(logCallback?: (message: string) => void): Promise<FFmpeg> {
    if (ffmpeg) {
        return ffmpeg;
    }
    const instance = new FFmpeg();
    instance.on('log', ({ message }) => {
        if (logCallback) logCallback(message);
        console.log(message);
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

    logCallback?.("Loading ffmpeg-core.js...");
    await instance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    logCallback?.("FFmpeg core loaded.");

    ffmpeg = instance;
    return instance;
}

const INPUT_FILENAME = 'input.mkv';
const OUTPUT_FILENAME = 'output.mp4';


export async function probeFile(ffmpeg: FFmpeg, file: File): Promise<FfmpegFile> {
    await ffmpeg.writeFile(INPUT_FILENAME, await fetchFile(file));

    const { logs, exitCode } = await ffmpeg.exec([
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-i', INPUT_FILENAME
    ], undefined, {
        logger: ({message}) => console.log(message)
    });

    if (exitCode !== 0) {
        throw new Error('Failed to probe file');
    }
    
    // In @ffmpeg/ffmpeg v0.12, the JSON output is in the logs, not a return value
    const result = logs.join('\n');
    
    const probeData = JSON.parse(result);
    const streams = probeData.streams as FfmpegStream[];

    const videoStreams = streams.filter(s => s.codec_type === 'video');
    const audioStreams = streams.filter(s => s.codec_type === 'audio');
    const subtitleStreams = streams.filter(s => s.codec_type === 'subtitle');

    return {
        name: file.name,
        streams: {
            video: videoStreams,
            audio: audioStreams,
            subtitles: subtitleStreams,
        }
    };
}

export async function remuxFile(ffmpeg: FFmpeg, audioIndex: number, subtitleIndex: number): Promise<string> {
    const args = [
        '-i', INPUT_FILENAME,
        '-map', '0:v:0',      // Select first video stream
        '-map', `0:a:${audioIndex}`, // Select chosen audio stream
    ];
    
    // Add subtitle track if selected
    if (subtitleIndex >= 0) {
        args.push('-map', `0:s:${subtitleIndex}`);
        args.push('-c:s', 'mov_text'); // Convert subtitles to a compatible format for MP4
    }
    
    // Copy video and audio codecs without re-encoding
    args.push('-c:v', 'copy');
    args.push('-c:a', 'copy');

    args.push(OUTPUT_FILENAME, '-y'); // y to overwrite

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(OUTPUT_FILENAME);
    return URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
}
