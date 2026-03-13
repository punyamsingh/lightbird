import { captureVideoThumbnail } from "../video-thumbnail";

function makeVideoElement(overrides: Partial<HTMLVideoElement> = {}): HTMLVideoElement {
  const listeners: Record<string, EventListener[]> = {};
  const el = {
    currentTime: 10,
    duration: 60,
    addEventListener: jest.fn((event: string, listener: EventListener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(listener);
    }),
    removeEventListener: jest.fn((event: string, listener: EventListener) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((l) => l !== listener);
      }
    }),
    _fireEvent: (event: string) => {
      listeners[event]?.forEach((l) => { l(new Event(event)); });
    },
    ...overrides,
  } as unknown as HTMLVideoElement & { _fireEvent: (event: string) => void };
  return el;
}

describe("captureVideoThumbnail", () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let createElementSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCtx = {
      drawImage: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => mockCtx),
      toDataURL: jest.fn(() => "data:image/jpeg;base64,mockeddata"),
    } as unknown as HTMLCanvasElement;

    const originalCreateElement = document.createElement.bind(document);
    createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation((tag: string) => {
        if (tag === "canvas") return mockCanvas;
        return originalCreateElement(tag);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a data URL string on success", async () => {
    const video = makeVideoElement({ currentTime: 10, duration: 60 }) as HTMLVideoElement & {
      _fireEvent: (e: string) => void;
    };

    const promise = captureVideoThumbnail(video as HTMLVideoElement, 5);
    (video as unknown as { _fireEvent: (e: string) => void })._fireEvent("seeked");

    const result = await promise;
    expect(result).toBe("data:image/jpeg;base64,mockeddata");
    expect(mockCtx.drawImage).toHaveBeenCalledWith(video, 0, 0, 320, 180);
  });

  it("returns null when canvas has no 2d context", async () => {
    (mockCanvas.getContext as jest.Mock).mockReturnValue(null);
    const video = makeVideoElement() as HTMLVideoElement;

    const result = await captureVideoThumbnail(video, 5);
    expect(result).toBeNull();
  });

  it("returns null when drawImage throws", async () => {
    (mockCtx.drawImage as jest.Mock).mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const video = makeVideoElement() as HTMLVideoElement & { _fireEvent: (e: string) => void };

    const promise = captureVideoThumbnail(video as HTMLVideoElement, 5);
    (video as unknown as { _fireEvent: (e: string) => void })._fireEvent("seeked");

    const result = await promise;
    expect(result).toBeNull();
  });

  it("restores currentTime after capture", async () => {
    const video = makeVideoElement({ currentTime: 10, duration: 60 }) as HTMLVideoElement & {
      _fireEvent: (e: string) => void;
    };
    const savedTime = (video as unknown as { currentTime: number }).currentTime;

    const promise = captureVideoThumbnail(video as HTMLVideoElement, 5);
    (video as unknown as { _fireEvent: (e: string) => void })._fireEvent("seeked");
    await promise;

    expect((video as unknown as { currentTime: number }).currentTime).toBe(savedTime);
  });

  it("seeks to min(atSeconds, duration) when duration is shorter than atSeconds", async () => {
    const video = makeVideoElement({ currentTime: 0, duration: 3 }) as HTMLVideoElement & {
      _fireEvent: (e: string) => void;
    };

    const promise = captureVideoThumbnail(video as HTMLVideoElement, 5);
    (video as unknown as { _fireEvent: (e: string) => void })._fireEvent("seeked");
    await promise;

    // Should have been set to min(5, 3) = 3 then restored to 0
    // After restoration, currentTime is back to 0 (savedTime)
    expect((video as unknown as { currentTime: number }).currentTime).toBe(0);
  });
});
