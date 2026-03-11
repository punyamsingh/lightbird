"use client";

import { useState, useEffect, useRef, RefObject } from "react";
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
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) hue-rotate(${filters.hue}deg)`;
      el.style.transform = `scale(${zoom})`;
      rafRef.current = null;
    });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [filters, zoom, videoRef]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setZoom(1);
  };

  return { filters, zoom, setFilters, setZoom, resetFilters };
}
