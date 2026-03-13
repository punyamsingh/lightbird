"use client";

import { useEffect } from "react";

export interface UseMediaSessionOptions {
  title: string | null;
  artwork?: string | null;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeekForward: () => void;
  onSeekBackward: () => void;
}

export function useMediaSession(options: UseMediaSessionOptions): void {
  const { title, artwork, onPlay, onPause, onNext, onPrev, onSeekForward, onSeekBackward } = options;

  // Update metadata when title or artwork changes
  useEffect(() => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;
    if (!title) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const artworkList: MediaImage[] = artwork
      ? [{ src: artwork, sizes: "320x180", type: "image/jpeg" }]
      : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: "LightBird",
      artwork: artworkList,
    });
  }, [title, artwork]);

  // Register action handlers (always-fresh closures)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;
    navigator.mediaSession.setActionHandler("play", onPlay);
    navigator.mediaSession.setActionHandler("pause", onPause);
    navigator.mediaSession.setActionHandler("nexttrack", onNext);
    navigator.mediaSession.setActionHandler("previoustrack", onPrev);
    navigator.mediaSession.setActionHandler("seekforward", ({ seekOffset }) => onSeekForward());
    navigator.mediaSession.setActionHandler("seekbackward", ({ seekOffset }) => onSeekBackward());

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
    };
  }, [onPlay, onPause, onNext, onPrev, onSeekForward, onSeekBackward]);

  // Clear metadata on unmount
  useEffect(() => {
    return () => {
      if (!("mediaSession" in navigator) || !navigator.mediaSession) return;
      navigator.mediaSession.metadata = null;
    };
  }, []);
}
