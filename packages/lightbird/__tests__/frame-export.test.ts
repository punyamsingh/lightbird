import {
  exportVideoFrame,
  downloadDataUrl,
  frameExportFilename,
} from "../src/utils/frame-export";

function makeVideoElement(
  overrides: Partial<HTMLVideoElement> = {}
): HTMLVideoElement {
  return {
    videoWidth: 1920,
    videoHeight: 1080,
    style: { filter: "" },
    ...overrides,
  } as unknown as HTMLVideoElement;
}

describe("exportVideoFrame", () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = {
      drawImage: jest.fn(),
      filter: "",
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => mockCtx),
      toDataURL: jest.fn(() => "data:image/png;base64,framedata"),
    } as unknown as HTMLCanvasElement;

    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return mockCanvas;
      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("captures the current frame at the video's native resolution", () => {
    const video = makeVideoElement({ videoWidth: 1280, videoHeight: 720 });

    const result = exportVideoFrame(video);

    expect(result).toBe("data:image/png;base64,framedata");
    expect(mockCanvas.width).toBe(1280);
    expect(mockCanvas.height).toBe(720);
    expect(mockCtx.drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720);
  });

  it("defaults to image/png output", () => {
    const video = makeVideoElement();

    exportVideoFrame(video);

    expect(mockCanvas.toDataURL).toHaveBeenCalledWith("image/png", undefined);
  });

  it("honours a custom type and quality", () => {
    const video = makeVideoElement();

    exportVideoFrame(video, { type: "image/jpeg", quality: 0.8 });

    expect(mockCanvas.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.8);
  });

  it("bakes a CSS filter into the canvas before drawing", () => {
    const video = makeVideoElement();

    exportVideoFrame(video, { filter: "brightness(150%)" });

    expect(mockCtx.filter).toBe("brightness(150%)");
  });

  it("returns null when the video has no decoded dimensions yet", () => {
    const video = makeVideoElement({ videoWidth: 0, videoHeight: 0 });

    expect(exportVideoFrame(video)).toBeNull();
    expect(mockCtx.drawImage).not.toHaveBeenCalled();
  });

  it("returns null when the canvas has no 2d context", () => {
    (mockCanvas.getContext as jest.Mock).mockReturnValue(null);
    const video = makeVideoElement();

    expect(exportVideoFrame(video)).toBeNull();
  });

  it("returns null when drawing throws (tainted cross-origin canvas)", () => {
    (mockCtx.drawImage as jest.Mock).mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const video = makeVideoElement();

    expect(exportVideoFrame(video)).toBeNull();
  });

  it("returns null when encoding throws", () => {
    (mockCanvas.toDataURL as jest.Mock).mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const video = makeVideoElement();

    expect(exportVideoFrame(video)).toBeNull();
  });
});

describe("downloadDataUrl", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("synthesizes an anchor click with the href and download filename", () => {
    const click = jest.fn();
    const anchor = { href: "", download: "", click } as unknown as HTMLAnchorElement;

    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") return anchor;
      return originalCreateElement(tag);
    });

    downloadDataUrl("data:image/png;base64,xyz", "frame.png");

    expect(anchor.href).toBe("data:image/png;base64,xyz");
    expect(anchor.download).toBe("frame.png");
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe("frameExportFilename", () => {
  it("produces a timestamped png name by default with no illegal colons", () => {
    const name = frameExportFilename();
    expect(name).toMatch(/^lightbird-screenshot-.+\.png$/);
    expect(name).not.toContain(":");
  });

  it("honours a custom extension", () => {
    expect(frameExportFilename("jpg")).toMatch(/\.jpg$/);
  });
});
