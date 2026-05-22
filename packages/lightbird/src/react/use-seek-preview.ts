import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { captureFrameAt } from "../utils/video-thumbnail";

export interface SeekPreviewState {
  /** Data URL of the captured frame for the hovered position, or `null`. */
  thumbnail: string | null;
  /** Hovered timestamp (seconds) the preview corresponds to, or `null`. */
  time: number | null;
  /** Request a preview at a hovered timestamp. Debounced and cached. */
  requestPreview: (timeSeconds: number) => void;
  /** Dismiss the preview, e.g. when the pointer leaves the seek bar. */
  clearPreview: () => void;
}

export interface UseSeekPreviewOptions {
  /** Debounce window in ms before a frame is captured. Default `120`. */
  debounceMs?: number;
  /** Captured thumbnail width in pixels. Default `160`. */
  width?: number;
  /** Captured thumbnail height in pixels. Default `90`. */
  height?: number;
}

/**
 * Generates thumbnail previews for seek-bar hover.
 *
 * Captures frames from a dedicated offscreen video element kept in sync with
 * the main player's source, so scrubbing the preview never disturbs playback.
 * Captures are debounced and cached per whole second.
 */
export function useSeekPreview(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: UseSeekPreviewOptions = {}
): SeekPreviewState {
  const { debounceMs = 120, width = 160, height = 90 } = options;

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [time, setTime] = useState<number | null>(null);

  const offscreenRef = useRef<HTMLVideoElement | null>(null);
  const loadedSrcRef = useRef<string>("");
  const cacheRef = useRef<Map<number, string>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic counter — lets async captures detect they have been superseded.
  const requestSeqRef = useRef(0);

  const syncOffscreenSource = useCallback((): HTMLVideoElement | null => {
    const main = videoRef.current;
    const src = main?.currentSrc || main?.src || "";
    if (!src) return null;

    if (!offscreenRef.current) {
      const v = document.createElement("video");
      v.muted = true;
      v.preload = "metadata";
      v.crossOrigin = "anonymous";
      v.setAttribute("playsinline", "");
      offscreenRef.current = v;
    }

    const offscreen = offscreenRef.current;
    if (loadedSrcRef.current !== src) {
      loadedSrcRef.current = src;
      cacheRef.current.clear();
      offscreen.src = src;
    }
    return offscreen;
  }, [videoRef]);

  const clearPreview = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    requestSeqRef.current += 1;
    setThumbnail(null);
    setTime(null);
  }, []);

  const requestPreview = useCallback(
    (timeSeconds: number) => {
      const main = videoRef.current;
      if (!main) return;

      const duration = main.duration;
      const hasDuration = !!duration && !Number.isNaN(duration);
      const clamped = hasDuration
        ? Math.max(0, Math.min(timeSeconds, duration))
        : Math.max(0, timeSeconds);
      setTime(clamped);
      if (!hasDuration) return;

      const seq = ++requestSeqRef.current;
      const bucket = Math.round(clamped);

      const cached = cacheRef.current.get(bucket);
      if (cached) {
        setThumbnail(cached);
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const offscreen = syncOffscreenSource();
        if (!offscreen) return;
        captureFrameAt(offscreen, bucket, width, height).then((dataUrl) => {
          if (seq !== requestSeqRef.current) return;
          if (dataUrl) {
            cacheRef.current.set(bucket, dataUrl);
            setThumbnail(dataUrl);
          }
        });
      }, debounceMs);
    },
    [videoRef, syncOffscreenSource, debounceMs, width, height]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const offscreen = offscreenRef.current;
      if (offscreen) offscreen.removeAttribute("src");
    };
  }, []);

  return { thumbnail, time, requestPreview, clearPreview };
}
