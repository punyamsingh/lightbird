import { renderHook } from "@testing-library/react";
import { useMediaSession } from "../../src/react/use-media-session";

type ActionHandler = ((details: MediaSessionActionDetails) => void) | null;

function makeMediaSessionMock() {
  const handlers: Record<string, ActionHandler> = {};
  return {
    metadata: null as MediaMetadata | null,
    setActionHandler: jest.fn((action: string, handler: ActionHandler) => {
      handlers[action] = handler;
    }),
    _handlers: handlers,
  };
}

const defaultOptions = {
  title: "Test Video",
  artwork: null,
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onNext: jest.fn(),
  onPrev: jest.fn(),
  onSeekForward: jest.fn(),
  onSeekBackward: jest.fn(),
};

describe("useMediaSession", () => {
  let mediaSessionMock: ReturnType<typeof makeMediaSessionMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    mediaSessionMock = makeMediaSessionMock();
    Object.defineProperty(navigator, "mediaSession", {
      value: mediaSessionMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sets navigator.mediaSession.metadata when title is provided", () => {
    renderHook(() => useMediaSession({ ...defaultOptions, title: "My Video" }));
    expect(mediaSessionMock.metadata).toBeInstanceOf(MediaMetadata);
    expect(mediaSessionMock.metadata?.title).toBe("My Video");
    expect(mediaSessionMock.metadata?.artist).toBe("LightBird");
  });

  it("sets null metadata when title is null", () => {
    renderHook(() => useMediaSession({ ...defaultOptions, title: null }));
    expect(mediaSessionMock.metadata).toBeNull();
  });

  it("includes artwork in metadata when provided", () => {
    const artwork = "data:image/jpeg;base64,abc123";
    renderHook(() => useMediaSession({ ...defaultOptions, title: "Video", artwork }));
    expect(mediaSessionMock.metadata?.artwork).toEqual([
      { src: artwork, sizes: "320x180", type: "image/jpeg" },
    ]);
  });

  it("registers all six action handlers", () => {
    renderHook(() => useMediaSession(defaultOptions));
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("play", expect.any(Function));
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("pause", expect.any(Function));
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("nexttrack", expect.any(Function));
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("previoustrack", expect.any(Function));
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("seekforward", expect.any(Function));
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("seekbackward", expect.any(Function));
  });

  it("play action calls onPlay", () => {
    const onPlay = jest.fn();
    renderHook(() => useMediaSession({ ...defaultOptions, onPlay }));
    const handler = mediaSessionMock._handlers["play"];
    expect(handler).not.toBeNull();
    handler?.({} as MediaSessionActionDetails);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("pause action calls onPause", () => {
    const onPause = jest.fn();
    renderHook(() => useMediaSession({ ...defaultOptions, onPause }));
    mediaSessionMock._handlers["pause"]?.({} as MediaSessionActionDetails);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("nexttrack action calls onNext", () => {
    const onNext = jest.fn();
    renderHook(() => useMediaSession({ ...defaultOptions, onNext }));
    mediaSessionMock._handlers["nexttrack"]?.({} as MediaSessionActionDetails);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("previoustrack action calls onPrev", () => {
    const onPrev = jest.fn();
    renderHook(() => useMediaSession({ ...defaultOptions, onPrev }));
    mediaSessionMock._handlers["previoustrack"]?.({} as MediaSessionActionDetails);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("seekforward action calls onSeekForward", () => {
    const onSeekForward = jest.fn();
    renderHook(() => useMediaSession({ ...defaultOptions, onSeekForward }));
    mediaSessionMock._handlers["seekforward"]?.({ action: "seekforward", seekOffset: 10 });
    expect(onSeekForward).toHaveBeenCalledTimes(1);
  });

  it("seekbackward action calls onSeekBackward", () => {
    const onSeekBackward = jest.fn();
    renderHook(() => useMediaSession({ ...defaultOptions, onSeekBackward }));
    mediaSessionMock._handlers["seekbackward"]?.({ action: "seekbackward", seekOffset: 10 });
    expect(onSeekBackward).toHaveBeenCalledTimes(1);
  });

  it("clears all action handlers and metadata on unmount", () => {
    const { unmount } = renderHook(() => useMediaSession(defaultOptions));
    jest.clearAllMocks();
    unmount();
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("play", null);
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("pause", null);
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("nexttrack", null);
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("previoustrack", null);
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("seekforward", null);
    expect(mediaSessionMock.setActionHandler).toHaveBeenCalledWith("seekbackward", null);
    expect(mediaSessionMock.metadata).toBeNull();
  });

  it("is a no-op when navigator.mediaSession is absent", () => {
    Object.defineProperty(navigator, "mediaSession", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // Should not throw
    expect(() => {
      renderHook(() => useMediaSession(defaultOptions));
    }).not.toThrow();
  });
});
