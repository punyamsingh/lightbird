import { useState, useEffect, useCallback, RefObject } from "react";

type SafariVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

/** Track and toggle fullscreen for this player, including native Safari video. */
export function useFullscreen(containerRef: RefObject<HTMLDivElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const video = container?.querySelector<SafariVideo>("video");
    const update = () => {
      setIsFullscreen((!!container && document.fullscreenElement === container) || !!video?.webkitDisplayingFullscreen);
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
      if (document.fullscreenElement === container) {
        void document.exitFullscreen?.().catch((error) => console.error("Fullscreen unavailable", error));
      } else if (video?.webkitDisplayingFullscreen) {
        video.webkitExitFullscreen?.();
      } else if (container.requestFullscreen) {
        void container.requestFullscreen().catch((error) => {
          if (video?.webkitEnterFullscreen) {
            try { video.webkitEnterFullscreen(); } catch (fallbackError) { console.error("Fullscreen unavailable", fallbackError); }
          } else {
            console.error("Fullscreen unavailable", error);
          }
        });
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
