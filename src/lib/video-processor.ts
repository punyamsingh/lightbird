
"use client";

import Demuxer from "web-demuxer";
import { Muxer as MP4Muxer } from 'mp4-muxer';

export interface ProcessedFile {
    name: string;
    videoStream?: ReadableStream<VideoFrame>;
    audioStream?: ReadableStream<AudioFrame>;
    videoTrack?: any;
    audioTracks: any[];
    subtitleTracks: any[];
}

let demuxer: Demuxer | null = null;
let muxer: MP4Muxer | null = null;
let processedFile: ProcessedFile | null = null;

export async function probeFile(file: File): Promise<ProcessedFile> {
  demuxer = new (Demuxer as any)({
    file,
    log: false,
  });

  await demuxer.init();
  const { video, audio, subtitles } = demuxer.streams;
  
  if (!video || video.length === 0) {
    throw new Error("No video track found in the file.");
  }
  
  processedFile = {
    name: file.name,
    videoTrack: video[0],
    audioTracks: audio,
    subtitleTracks: subtitles,
  };
  
  return processedFile;
}

export async function remuxFile(audioTrackIndex: number, subtitleTrackIndex: number = -1): Promise<string> {
    if (!demuxer || !processedFile || !processedFile.videoTrack) {
        throw new Error("File not probed or no video track available.");
    }

    const selectedAudioTrack = processedFile.audioTracks[audioTrackIndex];
    if (!selectedAudioTrack) {
        throw new Error(`Audio track with index ${audioTrackIndex} not found.`);
    }

    let selectedSubtitleTrack = subtitleTrackIndex !== -1 ? processedFile.subtitleTracks[subtitleTrackIndex] : null;

    muxer = new MP4Muxer({
        target: 'buffer',
        video: {
            codec: 'avc',
            width: processedFile.videoTrack.width,
            height: processedFile.videoTrack.height,
        },
        audio: {
            codec: 'aac',
            sampleRate: selectedAudioTrack.sampleRate,
            numberOfChannels: selectedAudioTrack.numberOfChannels,
        },
        subtitle: selectedSubtitleTrack ? {
            codec: 'webvtt'
        } : undefined,
        fastStart: 'fragmented',
    });

    const streams = await demuxer.start();

    const videoStream = streams.video?.pipeThrough(new TransformStream({
        transform(chunk, controller) {
            muxer?.processVideo(chunk);
            controller.enqueue(chunk);
        }
    }));
    
    const audioStream = streams.audio[audioTrackIndex]?.pipeThrough(new TransformStream({
        transform(chunk, controller) {
            muxer?.processAudio(chunk);
            controller.enqueue(chunk);
        }
    }));

    if (selectedSubtitleTrack && streams.subtitles && streams.subtitles[subtitleTrackIndex]) {
        const subtitleStream = streams.subtitles[subtitleTrackIndex]?.pipeThrough(new TransformStream({
            transform(chunk, controller) {
                muxer?.processSubtitle(chunk);
                controller.enqueue(chunk);
            }
        }));
        if(subtitleStream) await subtitleStream.pipeTo(new WritableStream()).catch(e => console.error("Subtitle stream error:", e));
    }

    const videoWriter = videoStream?.getWriter();
    const audioWriter = audioStream?.getWriter();
    
    const pump = async (writer: ReadableStreamDefaultWriter<any> | undefined) => {
        if (!writer) return;
        while(true) {
            const { done } = await writer.read();
            if (done) break;
        }
    }

    await Promise.all([pump(videoWriter), pump(audioWriter)]);

    muxer.close();
    const { buffer } = muxer.target;

    const blob = new Blob([buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
}
