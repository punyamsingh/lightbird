"use client";

import { useEffect, useRef } from "react";
import type { useVideoPlayback } from "./use-video-playback";
import type { useFullscreen } from "./use-fullscreen";

type Playback = ReturnType<typeof useVideoPlayback>;
type Fullscreen = ReturnType<typeof useFullscreen>;

export function useKeyboardShortcuts(playback: Playback, fullscreen: Fullscreen) {
  const playbackRef = useRef(playback);
  const fullscreenRef = useRef(fullscreen);

  useEffect(() => {
    playbackRef.current = playback;
  });
  useEffect(() => {
    fullscreenRef.current = fullscreen;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const pb = playbackRef.current;
      const fs = fullscreenRef.current;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          pb.togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          pb.seek(pb.progress + 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          pb.seek(pb.progress - 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          pb.setVolume(Math.min(1, pb.volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          pb.setVolume(Math.max(0, pb.volume - 0.1));
          break;
        case "KeyM":
          e.preventDefault();
          pb.toggleMute();
          break;
        case "KeyF":
          e.preventDefault();
          fs.toggle();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
