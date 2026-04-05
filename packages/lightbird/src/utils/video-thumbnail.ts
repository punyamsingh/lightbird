export async function captureVideoThumbnail(
  videoEl: HTMLVideoElement,
  atSeconds = 5
): Promise<string | null> {
  return new Promise((resolve) => {
    const savedTime = videoEl.currentTime;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }

    const cleanup = () => {
      videoEl.removeEventListener("seeked", onSeeked);
      videoEl.removeEventListener("error", onError);
    };

    const onSeeked = () => {
      try {
        ctx.drawImage(videoEl, 0, 0, 320, 180);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        resolve(null);
      } finally {
        videoEl.currentTime = savedTime;
        cleanup();
      }
    };

    const onError = () => {
      cleanup();
      resolve(null);
    };

    videoEl.addEventListener("seeked", onSeeked, { once: true });
    videoEl.addEventListener("error", onError, { once: true });

    try {
      videoEl.currentTime = Math.min(atSeconds, videoEl.duration || 0);
    } catch {
      cleanup();
      resolve(null);
    }
  });
}
