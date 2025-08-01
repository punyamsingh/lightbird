
"use client";

import { Demuxer, Muxer } from "web-demuxer";
import { MP4Muxer } from 'mp4-muxer';

export interface ProcessedFile {
    name: string;
    videoStream?: ReadableStream<VideoFrame>;
    audioStream?: ReadableStream<AudioFrame>;
    videoTrack?: any;
    audioTracks: any[];
    subtitleTracks: any[];
}

let demuxer: Demuxer | null = null;
let muxer: Muxer | null = null;
let processedFile: ProcessedFile | null = null;

export async function probeFile(file: File): Promise<ProcessedFile> {
  demuxer = new Demuxer({
    file,
    log: false,
  });

  const { video, audio, subtitles } = await demuxer.probe();
  
  if (!video) {
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

    muxer = new Muxer({
        target: new MP4Muxer({}),
        video: {
            codec: processedFile.videoTrack.codec,
            width: processedFile.videoTrack.width,
            height: processedFile.videoTrack.height,
        },
        audio: {
            codec: selectedAudioTrack.codec,
            sampleRate: selectedAudioTrack.sampleRate,
            numberOfChannels: selectedAudioTrack.numberOfChannels,
        },
        subtitle: selectedSubtitleTrack ? {
            codec: selectedSubtitleTrack.codec,
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

    if (selectedSubtitleTrack && streams.subtitles) {
        const subtitleStream = streams.subtitles[subtitleTrackIndex]?.pipeThrough(new TransformStream({
            transform(chunk, controller) {
                muxer?.processSubtitle(chunk);
                controller.enqueue(chunk);
            }
        }));
        // We don't need to do anything with the stream after muxing
        if(subtitleStream) await subtitleStream.pipeTo(new WritableStream());
    }

    // These pipes must not be awaited to allow playback to start quickly
    if (videoStream) videoStream.pipeTo(new WritableStream());
    if (audioStream) audioStream.pipeTo(new WritableStream());

    const { buffer } = await muxer.finish();
    const blob = new Blob([buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
}
