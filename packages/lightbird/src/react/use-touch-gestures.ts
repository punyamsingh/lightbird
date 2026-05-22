import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export interface TouchGestureHandlers {
  /** Seek relative to the current time by a signed number of seconds. */
  seekBy?: (seconds: number) => void;
  /** Read the current volume as a 0..1 value. */
  getVolume?: () => number;
  /** Set the volume to a 0..1 value. */
  setVolume?: (value: number) => void;
  /** Read the current brightness as a 0..1 fraction. */
  getBrightness?: () => number;
  /** Set the brightness to a 0..1 fraction. */
  setBrightness?: (value: number) => void;
}

export type TouchGestureFeedback =
  | { type: "seek"; direction: "forward" | "backward"; seconds: number }
  | { type: "volume"; value: number }
  | { type: "brightness"; value: number };

export interface UseTouchGesturesOptions {
  /** Disable the gesture listeners entirely. Default `true` (enabled). */
  enabled?: boolean;
  /** Seconds to seek on a double-tap. Default `10`. */
  seekSeconds?: number;
  /** Time window in ms for a second tap to count as a double-tap. Default `300`. */
  doubleTapMs?: number;
  /** How long the feedback indicator stays visible, in ms. Default `700`. */
  feedbackMs?: number;
}

export interface TouchGesturesState {
  /** The most recent gesture for a transient on-screen indicator, or `null`. */
  feedback: TouchGestureFeedback | null;
}

// Movement (px) before a touch is treated as a swipe rather than a tap.
const SWIPE_THRESHOLD = 10;
// Max distance (px) between the two taps of a double-tap.
const DOUBLE_TAP_DISTANCE = 40;

type Zone = "left" | "right";
type GesturePhase = "idle" | "pending" | "swipe" | "ignore";

interface ActiveTouch {
  x: number;
  y: number;
  zone: Zone;
  height: number;
}

/**
 * Touch gesture controls for the player surface.
 *
 * - Double-tap the left/right half to seek backward/forward.
 * - Vertical swipe on the right half to adjust volume.
 * - Vertical swipe on the left half to adjust brightness.
 *
 * Returns transient `feedback` describing the latest gesture so a UI overlay
 * can show what changed.
 */
export function useTouchGestures(
  targetRef: RefObject<HTMLElement | null>,
  handlers: TouchGestureHandlers,
  options: UseTouchGesturesOptions = {}
): TouchGesturesState {
  const { enabled = true, seekSeconds = 10, doubleTapMs = 300, feedbackMs = 700 } = options;

  const [feedback, setFeedback] = useState<TouchGestureFeedback | null>(null);

  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const startRef = useRef<ActiveTouch | null>(null);
  const phaseRef = useRef<GesturePhase>("idle");
  const swipeBaseRef = useRef(0);
  const lastTapRef = useRef<{ x: number; y: number; time: number; zone: Zone } | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback(
    (fb: TouchGestureFeedback) => {
      setFeedback(fb);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setFeedback(null), feedbackMs);
    },
    [feedbackMs]
  );

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        // Multi-touch (e.g. pinch) — abandon any single-touch gesture.
        startRef.current = null;
        phaseRef.current = "ignore";
        return;
      }
      const t = e.touches[0];
      const rect = el.getBoundingClientRect();
      const relX = t.clientX - rect.left;
      startRef.current = {
        x: t.clientX,
        y: t.clientY,
        zone: relX < rect.width / 2 ? "left" : "right",
        height: rect.height || 1,
      };
      phaseRef.current = "pending";
    };

    const onTouchMove = (e: TouchEvent) => {
      const start = startRef.current;
      if (!start || phaseRef.current === "ignore" || phaseRef.current === "idle") return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;

      if (phaseRef.current === "pending") {
        if (Math.hypot(dx, dy) < SWIPE_THRESHOLD) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          phaseRef.current = "swipe";
          const h = handlersRef.current;
          swipeBaseRef.current =
            start.zone === "left" ? h.getBrightness?.() ?? 1 : h.getVolume?.() ?? 1;
        } else {
          // Horizontal swipe is not mapped — stop tracking this touch.
          phaseRef.current = "ignore";
          return;
        }
      }

      if (phaseRef.current === "swipe") {
        if (e.cancelable) e.preventDefault();
        const fraction = -dy / start.height;
        const next = Math.max(0, Math.min(1, swipeBaseRef.current + fraction));
        const h = handlersRef.current;
        if (start.zone === "left") {
          h.setBrightness?.(next);
          showFeedback({ type: "brightness", value: next });
        } else {
          h.setVolume?.(next);
          showFeedback({ type: "volume", value: next });
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const start = startRef.current;
      const phase = phaseRef.current;
      startRef.current = null;
      phaseRef.current = "idle";
      if (!start || phase === "ignore") return;
      if (phase === "swipe") {
        // A finished swipe must not pair with a later tap.
        lastTapRef.current = null;
        return;
      }

      // A tap with no significant movement — check for a double-tap.
      const point = e.changedTouches[0];
      const px = point ? point.clientX : start.x;
      const py = point ? point.clientY : start.y;
      const now = Date.now();
      const last = lastTapRef.current;

      if (
        last &&
        last.zone === start.zone &&
        now - last.time < doubleTapMs &&
        Math.hypot(px - last.x, py - last.y) < DOUBLE_TAP_DISTANCE
      ) {
        lastTapRef.current = null;
        if (e.cancelable) e.preventDefault();
        const h = handlersRef.current;
        if (start.zone === "left") {
          h.seekBy?.(-seekSeconds);
          showFeedback({ type: "seek", direction: "backward", seconds: seekSeconds });
        } else {
          h.seekBy?.(seekSeconds);
          showFeedback({ type: "seek", direction: "forward", seconds: seekSeconds });
        }
      } else {
        lastTapRef.current = { x: px, y: py, time: now, zone: start.zone };
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [targetRef, enabled, seekSeconds, doubleTapMs, showFeedback]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  return { feedback };
}
