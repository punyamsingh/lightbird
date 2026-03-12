"use client";

import { useState, useEffect, useCallback, type RefObject } from "react";
import type { VideoMetadata } from "@/types";
import { extractNativeMetadata } from "@/lib/video-info";

export function useVideoInfo(
  videoRef: RefObject<HTMLVideoElement | null>,
  currentFile: File | null
) {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onLoaded = () => {
      const native = extractNativeMetadata(el, currentFile ?? undefined);
      setMetadata((prev) => ({ ...prev, ...native }) as VideoMetadata);
    };

    el.addEventListener("loadedmetadata", onLoaded);
    return () => el.removeEventListener("loadedmetadata", onLoaded);
  }, [videoRef, currentFile]);

  // Reset when file changes
  useEffect(() => {
    if (!currentFile) setMetadata(null);
  }, [currentFile]);

  const enrichMetadata = useCallback((extra: Partial<VideoMetadata>) => {
    setMetadata((prev) => (prev ? { ...prev, ...extra } : null));
  }, []);

  return { metadata, enrichMetadata };
}
