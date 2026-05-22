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

/**
 * Capture a single video frame at a specific timestamp.
 *
 * Unlike {@link captureVideoThumbnail}, this does not save/restore
 * `currentTime` — it is built for a dedicated, offscreen preview video so the
 * main playback element is never disturbed. Powers seek-bar hover previews.
 *
 * @param videoEl - A video element (typically offscreen) to seek and capture.
 * @param timeSeconds - Timestamp to capture, clamped to the video duration.
 * @param width - Output thumbnail width in pixels.
 * @param height - Output thumbnail height in pixels.
 * @returns A JPEG data URL, or `null` if capture failed (no 2d context, a
 *          tainted canvas, or a media error).
 */
export async function captureFrameAt(
  videoEl: HTMLVideoElement,
  timeSeconds: number,
  width = 160,
  height = 90
): Promise<string | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }

    let settled = false;

    const cleanup = () => {
      videoEl.removeEventListener("seeked", onSeeked);
      videoEl.removeEventListener("error", onError);
      videoEl.removeEventListener("loadedmetadata", onLoadedMetadata);
    };

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const draw = () => {
      try {
        ctx.drawImage(videoEl, 0, 0, width, height);
        finish(canvas.toDataURL("image/jpeg", 0.6));
      } catch {
        finish(null);
      }
    };

    const seekTo = () => {
      const duration = videoEl.duration || 0;
      const target =
        duration > 0
          ? Math.max(0, Math.min(timeSeconds, duration))
          : Math.max(0, timeSeconds);
      // Re-assigning currentTime to its current value fires no `seeked` event.
      if (Math.abs(videoEl.currentTime - target) < 0.05) {
        draw();
        return;
      }
      try {
        videoEl.currentTime = target;
      } catch {
        finish(null);
      }
    };

    const onSeeked = () => draw();
    const onError = () => finish(null);
    const onLoadedMetadata = () => seekTo();

    videoEl.addEventListener("seeked", onSeeked);
    videoEl.addEventListener("error", onError);

    // HAVE_METADATA (1) — duration and dimensions are known, safe to seek.
    if (videoEl.readyState >= 1) {
      seekTo();
    } else {
      videoEl.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    }
  });
}
