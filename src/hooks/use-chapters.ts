"use client";

import { useState, useEffect, useCallback, type RefObject } from "react";
import type { Chapter } from "@/types";
import type { VideoPlayer } from "@/lib/video-processor";

export function useChapters(
  videoRef: RefObject<HTMLVideoElement>,
  playerRef: RefObject<VideoPlayer | null>,
): {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  goToChapter: (index: number) => void;
} {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);

  // When the playerRef value changes (new file loaded), pull chapters from it
  useEffect(() => {
    const player = playerRef.current;
    const loaded = player?.getChapters?.() ?? [];
    setChapters(loaded);
    setCurrentChapter(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef.current]);

  // Track the current chapter based on timeupdate events
  useEffect(() => {
    const el = videoRef.current;
    if (!el || chapters.length === 0) {
      setCurrentChapter(null);
      return;
    }

    const onTimeUpdate = () => {
      const t = el.currentTime;
      const active =
        chapters.find((c) => t >= c.startTime && t < c.endTime) ?? null;
      setCurrentChapter(active);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoRef, chapters]);

  const goToChapter = useCallback(
    (index: number) => {
      const el = videoRef.current;
      if (!el || !chapters[index]) return;
      el.currentTime = chapters[index].startTime;
    },
    [videoRef, chapters],
  );

  return { chapters, currentChapter, goToChapter };
}
