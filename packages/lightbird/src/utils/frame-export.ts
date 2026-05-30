/**
 * Frame / screenshot export.
 *
 * Captures the currently displayed frame of a playing video element to an
 * image and (optionally) triggers a browser download. Unlike the seek-hover
 * preview in {@link ./video-thumbnail}, this grabs the frame *in place* at the
 * video's native resolution without seeking, so it never disturbs playback.
 */

export interface ExportFrameOptions {
  /** Output image MIME type. Defaults to `"image/png"`. */
  type?: string;
  /** Quality (0–1) for lossy formats such as jpeg/webp. Ignored for png. */
  quality?: number;
  /**
   * CSS `filter` string to bake into the exported image (e.g. the
   * brightness/contrast filters applied to the video element). When omitted,
   * the raw frame is captured.
   */
  filter?: string;
}

/**
 * Capture the current frame of a video element at its native resolution.
 *
 * @param videoEl - The video element to capture from.
 * @param options - Output format and an optional CSS filter to bake in.
 * @returns An image data URL, or `null` if capture failed — no 2d context, the
 *          video has no decoded dimensions yet, or the canvas is tainted by a
 *          cross-origin source.
 */
export function exportVideoFrame(
  videoEl: HTMLVideoElement,
  options: ExportFrameOptions = {}
): string | null {
  const { type = "image/png", quality, filter } = options;

  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;
  // No decoded frame yet — nothing to capture.
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    if (filter) ctx.filter = filter;
    ctx.drawImage(videoEl, 0, 0, width, height);
    return canvas.toDataURL(type, quality);
  } catch {
    // Tainted canvas (cross-origin video without CORS) or encode failure.
    return null;
  }
}

/**
 * Trigger a browser download of a data URL by synthesizing an anchor click.
 *
 * @param dataUrl - The data (or object) URL to download.
 * @param filename - The suggested filename for the saved file.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/**
 * Build a timestamped default filename for an exported frame.
 *
 * @param extension - File extension without a leading dot. Defaults to `"png"`.
 * @returns e.g. `lightbird-screenshot-2026-05-30T12-00-00-000Z.png`.
 */
export function frameExportFilename(extension = "png"): string {
  // Colons are illegal in filenames on some platforms — swap them out.
  const stamp = new Date().toISOString().replace(/:/g, "-");
  return `lightbird-screenshot-${stamp}.${extension}`;
}
