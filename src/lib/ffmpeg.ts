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
    await instance.load();
    logCallback?.("FFmpeg core loaded.");

    ffmpeg = instance;
    return instance;
}

const INPUT_FILENAME = 'input.mkv';
const OUTPUT_FILENAME = 'output.mp4';


export async function probeFile(ffmpeg: FFmpeg, file: File): Promise<FfmpegFile> {
    await ffmpeg.writeFile(INPUT_FILENAME, await fetchFile(file));

    const logs: string[] = [];
    const logListener = ({ message }: { message: string }) => {
        // Capture all logs during this specific execution
        logs.push(message);
    };
    ffmpeg.on('log', logListener);

    try {
        // This command forces ffmpeg to process the input and print info without creating an output file.
        await ffmpeg.exec(['-i', INPUT_FILENAME, '-f', 'null', '-']);
    } catch(e) {
        // This command is expected to throw an error because there's no output, but it still logs the stream info.
    } finally {
        // IMPORTANT: Turn off the listener to avoid capturing logs from other operations.
        ffmpeg.off('log', logListener);
    }
    
    // Now parse the logs
    const fullLog = logs.join('\n');
    
    const streams: FfmpegStream[] = [];
    const streamRegex = /Stream #0:(\d+)(?:\((.*?)\))?: (\w+): (.*?)(\s|$)/g;
    let match;

    while ((match = streamRegex.exec(fullLog)) !== null) {
        const streamIndex = parseInt(match[1], 10);
        const language = match[2];
        const streamType = match[3].toLowerCase() as 'video' | 'audio' | 'subtitle';
        const codecInfo = match[4].split(',')[0].trim();

        if (streamType === 'video' || streamType === 'audio' || streamType === 'subtitle') {
            streams.push({
                index: streamIndex,
                codec_type: streamType,
                codec_name: codecInfo,
                codec_long_name: codecInfo,
                tags: {
                    language: language,
                }
            });
        }
    }


    if (streams.length === 0) {
        console.error("Full FFmpeg Log:", fullLog);
        throw new Error("Failed to probe file. No stream information was logged.");
    }

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
    
    if (subtitleIndex >= 0) {
        const subStream = (await probeFile(ffmpeg, new File([], INPUT_FILENAME))).streams.subtitles.find(s => s.index === subtitleIndex);
        
        args.push('-map', `0:s:${subStream?.index}`);
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