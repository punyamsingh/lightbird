import { extractNativeMetadata } from "../src/utils/video-info";

function makeVideoElement(overrides: Partial<HTMLVideoElement> = {}): HTMLVideoElement {
  const el = document.createElement("video");
  Object.defineProperties(el, {
    videoWidth: { value: overrides.videoWidth ?? 1920, configurable: true },
    videoHeight: { value: overrides.videoHeight ?? 1080, configurable: true },
    duration: { value: overrides.duration ?? 120, configurable: true },
    currentSrc: { value: overrides.currentSrc ?? "http://example.com/video.mp4", configurable: true },
  });
  return el;
}

function makeFile(name: string, size = 1024 * 1024): File {
  return new File(["x".repeat(100)], name, { type: "video/mp4", lastModified: Date.now() });
}

describe("extractNativeMetadata", () => {
  it("extracts resolution from video element", () => {
    const el = makeVideoElement({ videoWidth: 1920, videoHeight: 1080 });
    const meta = extractNativeMetadata(el);
    expect(meta.width).toBe(1920);
    expect(meta.height).toBe(1080);
  });

  it("extracts duration from video element", () => {
    const el = makeVideoElement({ duration: 300 });
    const meta = extractNativeMetadata(el);
    expect(meta.duration).toBe(300);
  });

  it("uses file name and size when file is provided", () => {
    const el = makeVideoElement();
    const file = makeFile("myvideo.mp4");
    const meta = extractNativeMetadata(el, file);
    expect(meta.filename).toBe("myvideo.mp4");
    expect(meta.fileSize).toBe(file.size);
  });

  it("detects container from file extension", () => {
    const el = makeVideoElement();
    const file = makeFile("test.webm");
    const meta = extractNativeMetadata(el, file);
    expect(meta.container).toBe("WEBM");
  });

  it("detects container from URL when no file", () => {
    const el = makeVideoElement({ currentSrc: "http://example.com/stream.mp4" });
    const meta = extractNativeMetadata(el);
    expect(meta.container).toBe("MP4");
  });

  it("sets advanced fields to null (not available from HTMLVideoElement)", () => {
    const el = makeVideoElement();
    const meta = extractNativeMetadata(el);
    expect(meta.frameRate).toBeNull();
    expect(meta.videoBitrate).toBeNull();
    expect(meta.videoCodec).toBeNull();
    expect(meta.colorSpace).toBeNull();
  });

  it("returns empty audio and subtitle track arrays", () => {
    const el = makeVideoElement();
    const meta = extractNativeMetadata(el);
    expect(meta.audioTracks).toEqual([]);
    expect(meta.subtitleTracks).toEqual([]);
  });

  it("fileSize is null when no file is provided", () => {
    const el = makeVideoElement();
    const meta = extractNativeMetadata(el);
    expect(meta.fileSize).toBeNull();
  });
});
