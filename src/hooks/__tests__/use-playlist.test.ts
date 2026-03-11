import { renderHook, act } from "@testing-library/react";
import { usePlaylist } from "../use-playlist";
import type { PlaylistItem } from "@/types";

function makeItem(name: string, type: "video" | "stream" = "video"): PlaylistItem {
  return { name, url: `blob:${name}`, type };
}

describe("usePlaylist", () => {
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
});
