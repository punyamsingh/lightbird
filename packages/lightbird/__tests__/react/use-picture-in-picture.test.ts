import { renderHook, act } from "@testing-library/react";
import { usePictureInPicture } from "../../src/react/use-picture-in-picture";

describe("usePictureInPicture", () => {
  let video: HTMLVideoElement;
  let videoRef: { current: HTMLVideoElement | null };

  beforeEach(() => {
    video = document.createElement("video");
    videoRef = { current: video };

    Object.defineProperty(document, "pictureInPictureEnabled", {
      value: true,
      writable: true,
      configurable: true,
    });

    video.requestPictureInPicture = jest.fn().mockResolvedValue(undefined);
    document.exitPictureInPicture = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reports isSupported=true when pictureInPictureEnabled is true", () => {
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    expect(result.current.isSupported).toBe(true);
  });

  it("reports isSupported=false when pictureInPictureEnabled is false", () => {
    Object.defineProperty(document, "pictureInPictureEnabled", {
      value: false,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    expect(result.current.isSupported).toBe(false);
  });

  it("starts with isPiP=false", () => {
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    expect(result.current.isPiP).toBe(false);
  });

  it("sets isPiP=true when enterpictureinpicture fires", () => {
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    act(() => {
      video.dispatchEvent(new Event("enterpictureinpicture"));
    });
    expect(result.current.isPiP).toBe(true);
  });

  it("sets isPiP=false when leavepictureinpicture fires", () => {
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    act(() => {
      video.dispatchEvent(new Event("enterpictureinpicture"));
    });
    act(() => {
      video.dispatchEvent(new Event("leavepictureinpicture"));
    });
    expect(result.current.isPiP).toBe(false);
  });

  it("enter() calls requestPictureInPicture on the video element", async () => {
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    await act(async () => {
      await result.current.enter();
    });
    expect(video.requestPictureInPicture).toHaveBeenCalledTimes(1);
  });

  it("exit() calls document.exitPictureInPicture", async () => {
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    await act(async () => {
      await result.current.exit();
    });
    expect(document.exitPictureInPicture).toHaveBeenCalledTimes(1);
  });

  it("toggle() calls enter() when not in PiP", async () => {
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    await act(async () => {
      await result.current.toggle();
    });
    expect(video.requestPictureInPicture).toHaveBeenCalledTimes(1);
  });

  it("toggle() calls exit() when already in PiP", async () => {
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    act(() => {
      video.dispatchEvent(new Event("enterpictureinpicture"));
    });
    await act(async () => {
      await result.current.toggle();
    });
    expect(document.exitPictureInPicture).toHaveBeenCalledTimes(1);
  });

  it("does nothing when videoRef.current is null", async () => {
    videoRef.current = null;
    const { result } = renderHook(() => usePictureInPicture(videoRef));
    await act(async () => {
      await result.current.enter();
    });
    // Should not throw
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(video, "removeEventListener");
    const { unmount } = renderHook(() => usePictureInPicture(videoRef));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "enterpictureinpicture",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "leavepictureinpicture",
      expect.any(Function)
    );
  });
});
