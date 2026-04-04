import { useState, useEffect, useCallback, RefObject } from "react";

export function useVideoPlayback(videoRef: RefObject<HTMLVideoElement | null>) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Sync initial state from element (may already have loaded metadata)
    setIsPlaying(!el.paused);
    setProgress(el.currentTime);
    if (el.duration && !Number.isNaN(el.duration)) setDuration(el.duration);
    setVolumeState(el.volume);
    setIsMuted(el.muted);

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setProgress(el.currentTime);
    const onLoadedMetadata = () => setDuration(el.duration);
    const onVolumeChange = () => {
      setVolumeState(el.volume);
      setIsMuted(el.muted);
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("volumechange", onVolumeChange);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("volumechange", onVolumeChange);
    };
  }, [videoRef]);

  // Keep el.loop in sync with loop state
  useEffect(() => {
    const el = videoRef.current;
    if (el) el.loop = loop;
  }, [loop, videoRef]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [videoRef]);

  const seek = useCallback(
    (t: number) => {
      const el = videoRef.current;
      if (!el) return;
      el.currentTime = Math.max(0, Math.min(t, el.duration || 0));
    },
    [videoRef]
  );

  const setVolume = useCallback(
    (v: number) => {
      const el = videoRef.current;
      if (!el) return;
      el.volume = v;
      el.muted = v === 0;
    },
    [videoRef]
  );

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
  }, [videoRef]);

  const setPlaybackRate = useCallback(
    (r: number) => {
      const el = videoRef.current;
      if (!el) return;
      el.playbackRate = r;
      setPlaybackRateState(r);
    },
    [videoRef]
  );

  const frameStep = useCallback(
    (direction: "forward" | "backward") => {
      const el = videoRef.current;
      if (!el) return;
      el.pause();
      const frameTime = 1 / 30; // fixed 30fps; independent of playback rate
      const delta = direction === "forward" ? frameTime : -frameTime;
      el.currentTime = Math.max(0, Math.min(el.currentTime + delta, el.duration || 0));
    },
    [videoRef]
  );

  const toggleLoop = useCallback(() => setLoop((l) => !l), []);

  return {
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    playbackRate,
    loop,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    frameStep,
    toggleLoop,
  };
}
