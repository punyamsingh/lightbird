import type { VideoMetadata } from "@/types";

function detectContainerFromUrl(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toUpperCase();
  return ext ?? "Unknown";
}

export function extractNativeMetadata(
  videoEl: HTMLVideoElement,
  file?: File
): Partial<VideoMetadata> {
  const container = file
    ? file.name.split(".").pop()?.toUpperCase() ?? "Unknown"
    : detectContainerFromUrl(videoEl.currentSrc);

  return {
    filename: file?.name ?? videoEl.currentSrc,
    fileSize: file?.size ?? null,
    duration: videoEl.duration || 0,
    container,
    width: videoEl.videoWidth,
    height: videoEl.videoHeight,
    frameRate: null,
    videoBitrate: null,
    videoCodec: null,
    colorSpace: null,
    audioTracks: [],
    subtitleTracks: [],
  };
}
