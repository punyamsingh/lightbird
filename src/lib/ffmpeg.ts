
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

    if (logCallback) {
        instance.on('log', ({ message }) => {
            if (message.startsWith('frame=')) return;
            logCallback(message);
        });
    }
    
    await instance.load({
        coreURL: '/vendor/ffmpeg/ffmpeg-core.js',
        wasmURL: '/vendor/ffmpeg/ffmpeg-core.wasm',
        workerURL: '/vendor/ffmpeg/ffmpeg-core.worker.js',
    });

    ffmpeg = instance;
    return instance;
}

const OUTPUT_FILENAME = 'output.mp4';


export async function probeFile(ffmpeg: FFmpeg, file: File): Promise<FfmpegFile> {
    const INPUT_FILENAME = file.name;
    await ffmpeg.writeFile(INPUT_FILENAME, await fetchFile(file));

    const logs: string[] = [];
    const logListener = ({ message }: { message: string }) => {
        logs.push(message);
    };
    ffmpeg.on('log', logListener);

    try {
        await ffmpeg.exec(['-i', INPUT_FILENAME, '-hide_banner']);
    } catch (e) {
        // This can happen and is fine, the logs are still captured.
    } finally {
        ffmpeg.off('log', logListener);
    }
    
    const fullLog = logs.join('\n');
    
    const streams: FfmpegStream[] = [];
    const streamRegex = /Stream #\d+:(\d+)(?:\((.*?)\))?: (\w+): (.*?)(\s|,|$)/g;
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
        console.error("Full FFmpeg Log for probing:", fullLog);
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

export async function remuxFile(ffmpeg: FFmpeg, inputFilename: string, audioStreamIndex: number, subtitleStreamIndex?: number): Promise<string> {
    const args = [
        '-i', inputFilename,
        '-map', '0:v:0',
    ];

    // Find the correct audio stream based on its *original* index
    // ffmpeg a: selector is by the stream's type index, not its original index
    args.push('-map', `0:a:${audioStreamIndex}`);
    
    if (subtitleStreamIndex !== undefined && subtitleStreamIndex >= 0) {
        // Same for subtitles
        args.push('-map', `0:s:${subtitleStreamIndex}`);
        args.push('-c:s', 'mov_text'); 
    }
    
    args.push('-c:v', 'copy');
    args.push('-c:a', 'copy');
    args.push('-y', OUTPUT_FILENAME);

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(OUTPUT_FILENAME);
    const blob = new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
}
