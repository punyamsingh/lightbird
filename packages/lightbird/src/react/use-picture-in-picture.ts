import { useState, useEffect, useCallback, RefObject } from "react";

export function usePictureInPicture(videoRef: RefObject<HTMLVideoElement | null>) {
  const [isPiP, setIsPiP] = useState(false);

  const isSupported =
    typeof document !== "undefined" &&
    "pictureInPictureEnabled" in document &&
    (document as Document).pictureInPictureEnabled;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnter = () => setIsPiP(true);
    const onLeave = () => setIsPiP(false);

    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);

    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [videoRef]);

  const enter = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.requestPictureInPicture();
    } catch (err) {
      console.error("Failed to enter picture-in-picture:", err);
    }
  }, [videoRef]);

  const exit = useCallback(async () => {
    try {
      await document.exitPictureInPicture();
    } catch (err) {
      console.error("Failed to exit picture-in-picture:", err);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isPiP) {
      await exit();
    } else {
      await enter();
    }
  }, [isPiP, enter, exit]);

  return { isPiP, isSupported, enter, exit, toggle };
}
