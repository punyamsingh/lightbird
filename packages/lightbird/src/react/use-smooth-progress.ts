import { useEffect, useRef, useState, type RefObject } from "react";

interface UseSmoothProgressOptions {
  isPlaying: boolean;
  fallback?: number;
}

/**
 * Drives a `progress` value at requestAnimationFrame rate by reading
 * `videoRef.current.currentTime` each frame while playing. Decouples the
 * visual seek-bar position from the video element's coarse `timeupdate`
 * events (~4Hz) so the thumb glides instead of stepping.
 *
 * Pauses the rAF loop when not playing or when the tab is hidden.
 */
export function useSmoothProgress(
  videoRef: RefObject<HTMLVideoElement | null>,
  { isPlaying, fallback = 0 }: UseSmoothProgressOptions
): number {
  const [progress, setProgress] = useState<number>(() => {
    const el = videoRef.current;
    return el ? el.currentTime : fallback;
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) {
      setProgress(fallback);
      return;
    }

    if (!isPlaying) {
      setProgress(el.currentTime);
      return;
    }

    const isHidden = () =>
      typeof document !== "undefined" && document.visibilityState === "hidden";

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const current = videoRef.current;
      if (!current) {
        // Element detached mid-playback — stop the loop so we don't spin
        // forever (effect deps don't track ref.current).
        setProgress(fallback);
        stop();
        return;
      }
      setProgress(current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (rafRef.current != null || isHidden()) return;
      rafRef.current = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const onVisibility = () => {
      if (isHidden()) {
        stop();
      } else {
        start();
      }
    };

    start();

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      stop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [isPlaying, videoRef, fallback]);

  return progress;
}
