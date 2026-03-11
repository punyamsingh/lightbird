"use client";

import { useEffect, RefObject } from "react";

const STORAGE_PREFIX = "lightbirdplayer-";
const SAVE_DEBOUNCE_MS = 5000;

export function useProgressPersistence(
  videoRef: RefObject<HTMLVideoElement | null>,
  currentVideoName: string | null
) {
  // Restore saved position when video changes
  useEffect(() => {
    if (!currentVideoName || !videoRef.current) return;
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${currentVideoName}`);
    if (saved) {
      const time = parseFloat(saved);
      if (!isNaN(time)) videoRef.current.currentTime = time;
    }
  }, [currentVideoName, videoRef]);

  // Save current position (debounced)
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !currentVideoName) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const onTimeUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.setItem(`${STORAGE_PREFIX}${currentVideoName}`, String(el.currentTime));
      }, SAVE_DEBOUNCE_MS);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      if (timer) clearTimeout(timer);
    };
  }, [currentVideoName, videoRef]);
}
