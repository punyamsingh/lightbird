import { useCallback, useEffect, useState, type RefObject } from "react";

export interface ABLoopState {
  /** Loop start point in seconds, or `null` when unset. */
  pointA: number | null;
  /** Loop end point in seconds, or `null` when unset. */
  pointB: number | null;
  /** True when both points are set and playback loops between them. */
  isLooping: boolean;
  /** Capture the current playback time as point A. */
  setPointA: () => void;
  /** Capture the current playback time as point B (requires A, must be after A). */
  setPointB: () => void;
  /** Clear both points and stop looping. */
  clear: () => void;
}

/**
 * A-B loop: repeat playback between two user-set points.
 *
 * `setPointA` captures the current time as the loop start; `setPointB`
 * captures the loop end (accepted only once A is set and the playhead is past
 * it). While both points are set, the playhead is kept within `[A, B]` and
 * jumps back to A whenever it reaches B. Points reset when a new source loads.
 */
export function useABLoop(videoRef: RefObject<HTMLVideoElement | null>): ABLoopState {
  const [pointA, setA] = useState<number | null>(null);
  const [pointB, setB] = useState<number | null>(null);

  const setPointA = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const t = el.currentTime;
    setA(t);
    // Discard a stale B that is no longer after the new A.
    setB((b) => (b !== null && b <= t ? null : b));
  }, [videoRef]);

  const setPointB = useCallback(() => {
    const el = videoRef.current;
    if (!el || pointA === null) return;
    const t = el.currentTime;
    if (t <= pointA) return;
    setB(t);
  }, [videoRef, pointA]);

  const clear = useCallback(() => {
    setA(null);
    setB(null);
  }, []);

  // Enforce the loop region: keep the playhead inside [A, B].
  useEffect(() => {
    const el = videoRef.current;
    if (!el || pointA === null || pointB === null) return;

    const onTimeUpdate = () => {
      if (el.currentTime >= pointB || el.currentTime < pointA) {
        el.currentTime = pointA;
      }
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoRef, pointA, pointB]);

  // A new media source invalidates the points.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onReset = () => clear();
    el.addEventListener("loadstart", onReset);
    el.addEventListener("emptied", onReset);
    return () => {
      el.removeEventListener("loadstart", onReset);
      el.removeEventListener("emptied", onReset);
    };
  }, [videoRef, clear]);

  return {
    pointA,
    pointB,
    isLooping: pointA !== null && pointB !== null,
    setPointA,
    setPointB,
    clear,
  };
}
