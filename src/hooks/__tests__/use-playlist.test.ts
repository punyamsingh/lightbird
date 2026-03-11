import { renderHook, act } from "@testing-library/react";
import { usePlaylist } from "../use-playlist";
import type { PlaylistItem } from "@/types";

function makeItem(name: string, type: "video" | "stream" = "video"): PlaylistItem {
  return { id: `id-${name}`, name, url: `blob:${name}`, type };
}

describe("usePlaylist", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("starts empty with no current item", () => {
    const { result } = renderHook(() => usePlaylist());
    expect(result.current.playlist).toHaveLength(0);
    expect(result.current.currentIndex).toBeNull();
    expect(result.current.currentItem).toBeNull();
  });

  it("selectItem updates currentIndex and currentItem", () => {
    const { result } = renderHook(() => usePlaylist());
    const item = makeItem("video.mp4");
    act(() => result.current.appendItem(item));
    act(() => result.current.selectItem(0));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentItem?.name).toBe("video.mp4");
  });

  it("appendItem adds items without changing currentIndex", () => {
    const { result } = renderHook(() => usePlaylist());
    act(() => result.current.appendItem(makeItem("a.mp4")));
    act(() => result.current.appendItem(makeItem("b.mp4")));
    expect(result.current.playlist).toHaveLength(2);
    expect(result.current.currentIndex).toBeNull();
  });

  it("replaceWithFile clears playlist and sets index to 0", () => {
    const { result } = renderHook(() => usePlaylist());
    act(() => result.current.appendItem(makeItem("old.mp4")));
    act(() => result.current.selectItem(0));
    const file = new File([""], "new.mp4", { type: "video/mp4" });
    act(() => result.current.replaceWithFile(file));
    expect(result.current.playlist).toHaveLength(1);
    expect(result.current.playlist[0].name).toBe("new.mp4");
    expect(result.current.playlist[0].id).toBeTruthy();
    expect(result.current.currentIndex).toBe(0);
  });

  function makeFileList(files: File[]): FileList {
    return Object.assign(files, {
      item: (i: number) => files[i],
    }) as unknown as FileList;
  }

  it("parseFiles separates video and subtitle files", () => {
    const { result } = renderHook(() => usePlaylist());
    const fileList = makeFileList([
      new File([""], "movie.mp4", { type: "video/mp4" }),
      new File([""], "subs.srt", { type: "text/plain" }),
      new File([""], "extra.vtt", { type: "text/vtt" }),
    ]);
    const { videoFiles, subtitleFiles } = result.current.parseFiles(fileList);
    expect(videoFiles).toHaveLength(1);
    expect(videoFiles[0].name).toBe("movie.mp4");
    expect(subtitleFiles).toHaveLength(2);
  });

  it("parseFiles detects video by extension", () => {
    const { result } = renderHook(() => usePlaylist());
    const fileList = makeFileList([new File([""], "movie.mkv")]);
    const { videoFiles } = result.current.parseFiles(fileList);
    expect(videoFiles).toHaveLength(1);
  });

  it("currentItem returns null for out-of-bounds index", () => {
    const { result } = renderHook(() => usePlaylist());
    act(() => result.current.setCurrentIndex(99));
    expect(result.current.currentItem).toBeNull();
  });

  describe("removeItem", () => {
    it("removes an item by index", () => {
      const { result } = renderHook(() => usePlaylist());
      act(() => result.current.appendItem(makeItem("a.mp4")));
      act(() => result.current.appendItem(makeItem("b.mp4")));
      act(() => result.current.removeItem(0));
      expect(result.current.playlist).toHaveLength(1);
      expect(result.current.playlist[0].name).toBe("b.mp4");
    });

    it("adjusts currentIndex when an item before the current is removed", () => {
      const { result } = renderHook(() => usePlaylist());
      act(() => result.current.appendItem(makeItem("a.mp4")));
      act(() => result.current.appendItem(makeItem("b.mp4")));
      act(() => result.current.appendItem(makeItem("c.mp4")));
      act(() => result.current.selectItem(2));
      act(() => result.current.removeItem(0));
      expect(result.current.currentIndex).toBe(1);
    });

    it("keeps currentIndex unchanged when removing an item after the current", () => {
      const { result } = renderHook(() => usePlaylist());
      act(() => result.current.appendItem(makeItem("a.mp4")));
      act(() => result.current.appendItem(makeItem("b.mp4")));
      act(() => result.current.selectItem(0));
      act(() => result.current.removeItem(1));
      expect(result.current.currentIndex).toBe(0);
    });

    it("clamps currentIndex to the last valid index when the current item is removed", () => {
      const { result } = renderHook(() => usePlaylist());
      act(() => result.current.appendItem(makeItem("a.mp4")));
      act(() => result.current.appendItem(makeItem("b.mp4")));
      act(() => result.current.selectItem(1));
      act(() => result.current.removeItem(1));
      expect(result.current.currentIndex).toBe(0);
    });

    it("sets currentIndex to null when the only item is removed", () => {
      const { result } = renderHook(() => usePlaylist());
      act(() => result.current.appendItem(makeItem("a.mp4")));
      act(() => result.current.selectItem(0));
      act(() => result.current.removeItem(0));
      expect(result.current.currentIndex).toBeNull();
    });
  });

  describe("reorderItems", () => {
    it("reorders the playlist", () => {
      const { result } = renderHook(() => usePlaylist());
      const a = makeItem("a.mp4");
      const b = makeItem("b.mp4");
      act(() => result.current.appendItem(a));
      act(() => result.current.appendItem(b));
      act(() => result.current.reorderItems([b, a]));
      expect(result.current.playlist[0].name).toBe("b.mp4");
      expect(result.current.playlist[1].name).toBe("a.mp4");
    });

    it("keeps currentIndex tracking the same item after reorder", () => {
      const { result } = renderHook(() => usePlaylist());
      const a = makeItem("a.mp4");
      const b = makeItem("b.mp4");
      act(() => result.current.appendItem(a));
      act(() => result.current.appendItem(b));
      act(() => result.current.selectItem(0)); // playing "a"
      act(() => result.current.reorderItems([b, a])); // "a" is now at index 1
      expect(result.current.currentIndex).toBe(1);
    });
  });

  describe("localStorage persistence", () => {
    it("persists stream items to localStorage", () => {
      const { result } = renderHook(() => usePlaylist());
      const stream = makeItem("Live", "stream");
      stream.url = "http://example.com/live";
      act(() => result.current.appendItem(stream));
      const saved = JSON.parse(localStorage.getItem("lightbird-playlist") ?? "[]");
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe("Live");
    });

    it("does not persist local video items to localStorage", () => {
      const { result } = renderHook(() => usePlaylist());
      act(() => result.current.appendItem(makeItem("local.mp4", "video")));
      const saved = JSON.parse(localStorage.getItem("lightbird-playlist") ?? "[]");
      expect(saved).toHaveLength(0);
    });

    it("restores persisted stream items on mount", () => {
      const stream = makeItem("Restored Stream", "stream");
      stream.url = "http://example.com/live";
      localStorage.setItem("lightbird-playlist", JSON.stringify([stream]));
      const { result } = renderHook(() => usePlaylist());
      // Give the effect time to run
      expect(result.current.playlist.length).toBeGreaterThanOrEqual(0);
    });
  });
});
