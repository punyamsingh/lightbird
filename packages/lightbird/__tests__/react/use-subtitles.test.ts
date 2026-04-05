import { renderHook, act } from "@testing-library/react";
import { useSubtitles } from "../../src/react/use-subtitles";

// Mock UniversalSubtitleManager
jest.mock("../../src/subtitles/subtitle-manager", () => ({
  UniversalSubtitleManager: jest.fn().mockImplementation(() => ({
    addSubtitleFiles: jest.fn().mockResolvedValue([]),
    removeSubtitle: jest.fn().mockReturnValue(true),
    switchSubtitle: jest.fn(),
    getSubtitles: jest.fn().mockReturnValue([]),
    importSubtitles: jest.fn(),
    destroy: jest.fn(),
  })),
}));

import { UniversalSubtitleManager } from "../../src/subtitles/subtitle-manager";

const defaultOptions = { onError: jest.fn(), onSuccess: jest.fn() };

describe("useSubtitles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with empty subtitles and active '-1'", () => {
    const { result } = renderHook(() => useSubtitles(defaultOptions));
    expect(result.current.subtitles).toHaveLength(0);
    expect(result.current.activeSubtitle).toBe("-1");
  });

  it("initManager creates a new UniversalSubtitleManager", () => {
    const { result } = renderHook(() => useSubtitles(defaultOptions));
    const el = document.createElement("video");
    act(() => result.current.initManager(el));
    expect(UniversalSubtitleManager).toHaveBeenCalledWith(el);
  });

  it("initManager destroys previous manager before creating new one", () => {
    const { result } = renderHook(() => useSubtitles(defaultOptions));
    const el = document.createElement("video");
    act(() => result.current.initManager(el));
    const firstInstance = (UniversalSubtitleManager as jest.Mock).mock.results[0].value;
    act(() => result.current.initManager(el));
    expect(firstInstance.destroy).toHaveBeenCalled();
  });

  it("importSubtitles sets subtitle state from manager", () => {
    const mockSubs = [{ id: "0", name: "English", lang: "en", type: "embedded" as const }];
    (UniversalSubtitleManager as jest.Mock).mockImplementationOnce(() => ({
      addSubtitleFiles: jest.fn().mockResolvedValue([]),
      removeSubtitle: jest.fn().mockReturnValue(true),
      switchSubtitle: jest.fn(),
      getSubtitles: jest.fn().mockReturnValue(mockSubs),
      importSubtitles: jest.fn(),
      destroy: jest.fn(),
    }));

    const { result } = renderHook(() => useSubtitles(defaultOptions));
    const el = document.createElement("video");
    act(() => result.current.initManager(el));
    act(() => result.current.importSubtitles(mockSubs));
    expect(result.current.subtitles).toEqual(mockSubs);
  });

  it("switchSubtitle updates activeSubtitle and calls manager", () => {
    const { result } = renderHook(() => useSubtitles(defaultOptions));
    const el = document.createElement("video");
    act(() => result.current.initManager(el));
    const managerInstance = (UniversalSubtitleManager as jest.Mock).mock.results[0].value;

    act(() => result.current.switchSubtitle("1"));
    expect(result.current.activeSubtitle).toBe("1");
    expect(managerInstance.switchSubtitle).toHaveBeenCalledWith("1");
  });

  it("reset clears state and destroys manager", () => {
    const { result } = renderHook(() => useSubtitles(defaultOptions));
    const el = document.createElement("video");
    act(() => result.current.initManager(el));
    const managerInstance = (UniversalSubtitleManager as jest.Mock).mock.results[0].value;

    act(() => result.current.reset());
    expect(result.current.subtitles).toHaveLength(0);
    expect(result.current.activeSubtitle).toBe("-1");
    expect(managerInstance.destroy).toHaveBeenCalled();
  });

  it("removeSubtitle calls manager and updates state", async () => {
    (UniversalSubtitleManager as jest.Mock).mockImplementationOnce(() => ({
      addSubtitleFiles: jest.fn().mockResolvedValue([]),
      removeSubtitle: jest.fn().mockReturnValue(true),
      switchSubtitle: jest.fn(),
      getSubtitles: jest.fn().mockReturnValue([]),
      importSubtitles: jest.fn(),
      destroy: jest.fn(),
    }));

    const { result } = renderHook(() => useSubtitles(defaultOptions));
    const el = document.createElement("video");
    act(() => result.current.initManager(el));
    const managerInstance = (UniversalSubtitleManager as jest.Mock).mock.results[0].value;

    act(() => result.current.removeSubtitle("0"));
    expect(managerInstance.removeSubtitle).toHaveBeenCalledWith("0");
  });
});
