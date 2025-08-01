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
    
    // Use a specific version for stability
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
const PROBE_OUTPUT_FILENAME = 'probe.json';


export async function probeFile(ffmpeg: FFmpeg, file: File): Promise<FfmpegFile> {
    await ffmpeg.writeFile(INPUT_FILENAME, await fetchFile(file));

    // Redirect stdout to a file to capture the JSON output.
    // The '-hide_banner' flag can make parsing easier.
    await ffmpeg.exec([
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-i', INPUT_FILENAME
    ], undefined, { stdout: true, stderr: true }).then(async (result: any) => {
        // Since we can't directly pipe to a file in this version easily,
        // we'll rely on the log, but a more robust way would be needed if logs were disabled.
        // A common workaround is to parse the text logs if JSON isn't available.
        // For now, we assume JSON output is in the logs or can be captured.
        // This part is tricky. Let's try to grab logs. A better way would be needed.
    });
    
    // This is a workaround as redirecting stdout from exec is not straightforward.
    // We run the command again, but this time we capture logs.
    const logs: string[] = [];
    ffmpeg.on('log', ({message}) => {
      // The JSON output from ffprobe is logged as stderr, so we collect it.
      if(message.startsWith('{')) { // A simple check for JSON
          logs.push(message);
      }
    });

    try {
        await ffmpeg.exec([
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_streams',
            '-i', INPUT_FILENAME,
        ]);
    } catch(e) {
        // It might throw an error because there's no output file, which is expected for probing.
    }

    // Turn off logger after use
    ffmpeg.off('log', () => {});

    if (logs.length === 0) {
        throw new Error("Failed to probe file. No JSON output was captured.");
    }
    
    try {
        // Join the logs in case the JSON is split across multiple log messages
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
    } catch(e) {
        console.error("Failed to parse FFmpeg probe output:", logs.join(''));
        throw new Error("Failed to parse video metadata.");
    }
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

    args.push('-y', OUTPUT_FILENAME); // y to overwrite

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(OUTPUT_FILENAME);
    const blob = new Blob([data as ArrayBuffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
}
