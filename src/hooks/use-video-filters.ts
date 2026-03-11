"use client";

import { useState, useEffect, RefObject } from "react";
import type { VideoFilters } from "@/types";

const DEFAULT_FILTERS: VideoFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
};

export function useVideoFilters(videoRef: RefObject<HTMLVideoElement | null>) {
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.style.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) hue-rotate(${filters.hue}deg)`;
    el.style.transform = `scale(${zoom})`;
  }, [filters, zoom, videoRef]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setZoom(1);
  };

  return { filters, zoom, setFilters, setZoom, resetFilters };
}
