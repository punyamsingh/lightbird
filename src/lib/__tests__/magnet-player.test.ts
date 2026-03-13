import {
  isMagnetUri,
  isVideoFile,
  getVideoFiles,
  hasAcceptedDisclaimer,
  acceptDisclaimer,
  DISCLAIMER_KEY,
  VIDEO_EXTENSIONS,
} from "../magnet-player";

// ─── isMagnetUri ──────────────────────────────────────────────────────────────

describe("isMagnetUri", () => {
  it("accepts a standard v1 magnet URI (btih 40-char hex)", () => {
    expect(
      isMagnetUri(
        "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Ubuntu&tr=udp://tracker.ubuntu.com:6969",
      ),
    ).toBe(true);
  });

  it("accepts a btih URI with 32-char base32 hash", () => {
    expect(
      isMagnetUri("magnet:?xt=urn:btih:MFRA2YLBORUGKY3VNFSXI2LGNNSXS"),
    ).toBe(true);
  });

  it("accepts a btmh (v2) magnet URI", () => {
    expect(
      isMagnetUri(
        "magnet:?xt=urn:btmh:1220caf1e1c30e81cb361b9ee167c4aa64228a7fa4fa9f6105232b28ad475a09188a0",
      ),
    ).toBe(true);
  });

  it("accepts a magnet URI with leading/trailing whitespace", () => {
    expect(
      isMagnetUri(
        "  magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10  ",
      ),
    ).toBe(true);
  });

  it("rejects a plain HTTPS URL", () => {
    expect(isMagnetUri("https://example.com/file.torrent")).toBe(false);
  });

  it("rejects a magnet URI without xt parameter", () => {
    expect(isMagnetUri("magnet:?dn=ubuntu")).toBe(false);
  });

  it("rejects a magnet URI with a hash that is too short (< 20 chars)", () => {
    expect(isMagnetUri("magnet:?xt=urn:btih:abc123")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isMagnetUri("")).toBe(false);
  });

  it("rejects null", () => {
    expect(isMagnetUri(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isMagnetUri(undefined)).toBe(false);
  });

  it("rejects a number", () => {
    expect(isMagnetUri(12345)).toBe(false);
  });

  it("rejects a string that merely contains a magnet URI", () => {
    expect(
      isMagnetUri(
        "Download here: magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10",
      ),
    ).toBe(false);
  });
});

// ─── isVideoFile ──────────────────────────────────────────────────────────────

describe("isVideoFile", () => {
  it.each(VIDEO_EXTENSIONS)("recognises .%s as a video file", (ext) => {
    expect(isVideoFile(`movie.${ext}`)).toBe(true);
  });

  it("is case-insensitive for the extension", () => {
    expect(isVideoFile("Movie.MP4")).toBe(true);
    expect(isVideoFile("clip.MKV")).toBe(true);
    expect(isVideoFile("show.WebM")).toBe(true);
  });

  it("rejects a subtitle file (.srt)", () => {
    expect(isVideoFile("subtitles.srt")).toBe(false);
  });

  it("rejects an image file (.jpg)", () => {
    expect(isVideoFile("thumbnail.jpg")).toBe(false);
  });

  it("rejects a text file (.nfo)", () => {
    expect(isVideoFile("readme.nfo")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isVideoFile("")).toBe(false);
  });

  it("rejects null", () => {
    expect(isVideoFile(null)).toBe(false);
  });

  it("handles filenames with multiple dots correctly", () => {
    expect(isVideoFile("my.favorite.movie.2024.mkv")).toBe(true);
    expect(isVideoFile("my.favorite.movie.2024.srt")).toBe(false);
  });
});

// ─── getVideoFiles ────────────────────────────────────────────────────────────

describe("getVideoFiles", () => {
  const makeTorrent = (names: string[]) => ({
    files: names.map((name) => ({ name, path: name, length: 1000 })),
  });

  it("returns only video files", () => {
    const torrent = makeTorrent([
      "movie.mp4",
      "subtitles.srt",
      "readme.nfo",
      "bonus.mkv",
    ]);
    const result = getVideoFiles(torrent);
    expect(result.map((f) => f.name)).toEqual(["bonus.mkv", "movie.mp4"]);
  });

  it("returns an empty array when no video files are present", () => {
    const torrent = makeTorrent(["readme.txt", "cover.jpg", "subtitles.srt"]);
    expect(getVideoFiles(torrent)).toHaveLength(0);
  });

  it("returns all files when all are videos", () => {
    const torrent = makeTorrent(["a.mp4", "b.mkv", "c.avi"]);
    expect(getVideoFiles(torrent)).toHaveLength(3);
  });

  it("sorts the results by path alphabetically", () => {
    const torrent = makeTorrent(["S01E03.mkv", "S01E01.mkv", "S01E02.mkv"]);
    const result = getVideoFiles(torrent);
    expect(result.map((f) => f.name)).toEqual([
      "S01E01.mkv",
      "S01E02.mkv",
      "S01E03.mkv",
    ]);
  });

  it("does not mutate the original files array", () => {
    const files = [
      { name: "b.mp4", path: "b.mp4", length: 100 },
      { name: "a.mp4", path: "a.mp4", length: 100 },
    ];
    const torrent = { files };
    getVideoFiles(torrent);
    expect(files[0].name).toBe("b.mp4"); // original order preserved
  });

  it("handles a torrent with nested folder paths", () => {
    const torrent = {
      files: [
        { name: "episode2.mkv", path: "Series/S01/episode2.mkv", length: 500 },
        { name: "cover.jpg", path: "Series/cover.jpg", length: 50 },
        { name: "episode1.mkv", path: "Series/S01/episode1.mkv", length: 500 },
      ],
    };
    const result = getVideoFiles(torrent);
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("Series/S01/episode1.mkv");
    expect(result[1].path).toBe("Series/S01/episode2.mkv");
  });
});

// ─── Disclaimer helpers ───────────────────────────────────────────────────────

describe("hasAcceptedDisclaimer / acceptDisclaimer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns false before the disclaimer is accepted", () => {
    expect(hasAcceptedDisclaimer()).toBe(false);
  });

  it("returns true after acceptDisclaimer() is called", () => {
    acceptDisclaimer();
    expect(hasAcceptedDisclaimer()).toBe(true);
  });

  it("uses the correct localStorage key", () => {
    acceptDisclaimer();
    expect(localStorage.getItem(DISCLAIMER_KEY)).toBe("true");
  });
});
