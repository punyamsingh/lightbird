import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

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
    
    logCallback?.("Loading ffmpeg-core.js...");
    // In v0.12, `load` is a part of the instance method.
    // The core, wasm, and worker paths can be configured here if needed.
    // We rely on the files being in the default public path.
    await instance.load();
    logCallback?.("FFmpeg core loaded.");

    ffmpeg = instance;
    return instance;
}

const INPUT_FILENAME = 'input.mkv';
const OUTPUT_FILENAME = 'output.mp4';


export async function probeFile(ffmpeg: FFmpeg, file: File): Promise<FfmpegFile> {
    await ffmpeg.writeFile(INPUT_FILENAME, await fetchFile(file));

    // FFprobe-wasm is not part of the main ffmpeg.wasm package anymore.
    // A common workaround is to run ffmpeg with an option that outputs stream info and parse it.
    // However, the `probe` command is not directly available. We'll capture logs from a simple -i run.

    const logs: string[] = [];
    const logListener = ({ message }: { message: string }) => {
        // Simple check to capture ffprobe-like JSON output if available or detailed stream info
        if(message.startsWith('{') || message.includes('Stream #')) {
          logs.push(message);
        }
    };
    ffmpeg.on('log', logListener);

    try {
        // Execute a command that will print stream info to stderr (which is captured by logs)
        await ffmpeg.exec([
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_streams',
            '-i', INPUT_FILENAME,
        ]);
    } catch(e) {
        // This command might fail if it doesn't produce an output file, which is expected.
        // The important part is that it logs the stream information.
    }
    
    ffmpeg.off('log', logListener);

    if (logs.length === 0) {
        throw new Error("Failed to probe file. No stream information was logged.");
    }

    try {
        const probeData = JSON.parse(logs.join(''));
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
    } catch (e) {
        console.error("Failed to parse FFmpeg probe JSON output:", logs.join(''));
        // Fallback or re-throw might be needed here.
        throw new Error("Failed to parse video metadata from logs.");
    }
}

export async function remuxFile(ffmpeg: FFmpeg, audioIndex: number, subtitleIndex: number): Promise<string> {
    const args = [
        '-i', INPUT_FILENAME,
        '-map', '0:v:0',      // Select first video stream
        '-map', `0:a:${audioIndex}`, // Select chosen audio stream
    ];
    
    if (subtitleIndex >= 0) {
        args.push('-map', `0:s:${subtitleIndex}`);
        args.push('-c:s', 'mov_text'); // MP4 compatible subtitle format
    }
    
    args.push('-c:v', 'copy');
    args.push('-c:a', 'copy');
    args.push('-y', OUTPUT_FILENAME);

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(OUTPUT_FILENAME);
    const blob = new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
}
