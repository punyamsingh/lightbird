import { useState, useEffect, useCallback, RefObject } from "react";

type SafariVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

export function useFullscreen(containerRef: RefObject<HTMLDivElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const video = container?.querySelector<SafariVideo>("video");
    const update = () => {
      setIsFullscreen(!!document.fullscreenElement || !!video?.webkitDisplayingFullscreen);
      setIsSupported(!!container?.requestFullscreen || !!video?.webkitEnterFullscreen);
    };
    update();
    document.addEventListener("fullscreenchange", update);
    video?.addEventListener("webkitbeginfullscreen", update);
    video?.addEventListener("webkitendfullscreen", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      video?.removeEventListener("webkitbeginfullscreen", update);
      video?.removeEventListener("webkitendfullscreen", update);
    };
  }, [containerRef]);

  const toggle = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const video = container.querySelector<SafariVideo>("video");
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch((error) => console.error("Fullscreen unavailable", error));
      } else if (video?.webkitDisplayingFullscreen) {
        video.webkitExitFullscreen?.();
      } else if (container.requestFullscreen) {
        void container.requestFullscreen().catch((error) => console.error("Fullscreen unavailable", error));
      } else {
        // iPhone Safari offers native video fullscreen rather than element fullscreen.
        video?.webkitEnterFullscreen?.();
      }
    } catch (error) {
      console.error("Fullscreen unavailable", error);
    }
  }, [containerRef]);

  return { isFullscreen, isSupported, toggle };
}
