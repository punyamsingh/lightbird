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

  // Save current position (debounced); flush immediately on cleanup
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
      if (timer) {
        // Flush the pending write so the position isn't lost on video switch/unmount
        clearTimeout(timer);
        localStorage.setItem(`${STORAGE_PREFIX}${currentVideoName}`, String(el.currentTime));
      }
    };
  }, [currentVideoName, videoRef]);
}
