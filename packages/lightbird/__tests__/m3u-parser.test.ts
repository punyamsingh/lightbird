import { parseM3U8, exportPlaylist } from "../src/parsers/m3u-parser";
import type { PlaylistItem } from "../src/types";

describe("parseM3U8", () => {
  it("parses a basic M3U8 with stream entries", () => {
    const text = [
      "#EXTM3U",
      "#EXTINF:-1,My Stream",
      "http://example.com/stream.m3u8",
    ].join("\n");
    const result = parseM3U8(text);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("My Stream");
    expect(result[0].url).toBe("http://example.com/stream.m3u8");
    expect(result[0].type).toBe("stream");
  });

  it("parses multiple stream entries", () => {
    const text = [
      "#EXTM3U",
      "#EXTINF:-1,Stream A",
      "http://a.example.com/live",
      "#EXTINF:-1,Stream B",
      "http://b.example.com/live",
    ].join("\n");
    const result = parseM3U8(text);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Stream A");
    expect(result[1].name).toBe("Stream B");
  });

  it("uses line as name when EXTINF is missing", () => {
    const text = ["#EXTM3U", "http://example.com/stream"].join("\n");
    const result = parseM3U8(text);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("http://example.com/stream");
  });

  it("parses local file entries as type video with empty url", () => {
    const text = [
      "#EXTM3U",
      "#EXTINF:-1,My Video",
      "myvideo.mp4",
    ].join("\n");
    const result = parseM3U8(text);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("video");
    expect(result[0].url).toBe("");
    expect(result[0].name).toBe("My Video");
  });

  it("ignores comment-only lines", () => {
    const text = ["#EXTM3U", "# This is a comment", "# Another comment"].join("\n");
    const result = parseM3U8(text);
    expect(result).toHaveLength(0);
  });

  it("handles EXTINF names with commas", () => {
    const text = [
      "#EXTM3U",
      "#EXTINF:-1,Name, With, Commas",
      "http://example.com/stream",
    ].join("\n");
    const result = parseM3U8(text);
    expect(result[0].name).toBe("Name, With, Commas");
  });

  it("trims whitespace from lines", () => {
    const text = [
      "#EXTM3U",
      "  #EXTINF:-1,Trimmed  ",
      "  http://example.com/stream  ",
    ].join("\n");
    const result = parseM3U8(text);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("http://example.com/stream");
  });
});

describe("exportPlaylist", () => {
  let createObjectURLSpy: jest.SpyInstance;
  let revokeObjectURLSpy: jest.SpyInstance;
  let clickSpy: jest.SpyInstance;
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;

  beforeEach(() => {
    createObjectURLSpy = jest
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock");
    revokeObjectURLSpy = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    clickSpy = jest.fn();
    appendChildSpy = jest.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    removeChildSpy = jest.spyOn(document.body, "removeChild").mockImplementation((el) => el);
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return { href: "", download: "", click: clickSpy } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls URL.createObjectURL and triggers a click", () => {
    const items: PlaylistItem[] = [
      { id: "1", name: "Stream 1", url: "http://example.com/1", type: "stream" },
    ];
    exportPlaylist(items);
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock");
  });

  it("creates a Blob with M3U8 content", () => {
    const blobSpy = jest.spyOn(global, "Blob").mockImplementation((content, options) => {
      return { content, options } as unknown as Blob;
    });
    const items: PlaylistItem[] = [
      { id: "1", name: "My Stream", url: "http://example.com/live", type: "stream" },
    ];
    exportPlaylist(items);
    expect(blobSpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining("#EXTM3U")]),
      expect.objectContaining({ type: "application/vnd.apple.mpegurl" })
    );
    blobSpy.mockRestore();
  });
});
