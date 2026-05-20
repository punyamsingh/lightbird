import { renderHook, act } from "@testing-library/react";

// isMagnetUri / getVideoFiles stay real (pure); the client factory is mocked.
jest.mock("../../src/magnet-player", () => {
  const actual = jest.requireActual("../../src/magnet-player");
  return {
    ...actual,
    getWebTorrentClient: jest.fn(),
    destroyWebTorrentClient: jest.fn(),
  };
});

import { useMagnet } from "../../src/react/use-magnet";
import { getWebTorrentClient, destroyWebTorrentClient } from "../../src/magnet-player";

const getClient = getWebTorrentClient as jest.Mock;
const destroyClient = destroyWebTorrentClient as jest.Mock;

const VALID_URI = "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10";

type TorrentFile = { name: string; path: string; length: number; streamURL?: string };

class FakeTorrent {
  destroyed = false;
  name = "Test Torrent";
  progress = 0;
  numPeers = 0;
  downloadSpeed = 0;
  uploadSpeed = 0;
  files: TorrentFile[] = [];
  private handlers: Record<string, Array<(...a: unknown[]) => void>> = {};

  on(event: string, cb: (...a: unknown[]) => void) {
    (this.handlers[event] ??= []).push(cb);
    return this;
  }
  emit(event: string, ...args: unknown[]) {
    (this.handlers[event] ?? []).forEach((h) => h(...args));
  }
  destroy = jest.fn(() => {
    this.destroyed = true;
  });
}

function makeClient(torrent: FakeTorrent) {
  return { add: jest.fn(() => torrent) };
}

/**
 * Calls addMagnet and flushes microtasks so `client.add` has run.
 * The pending promise is returned wrapped in an object — returning it bare
 * from this async helper would make the async wrapper adopt (await) it.
 */
async function startAddMagnet(
  addMagnet: (uri: string) => Promise<unknown>,
  uri = VALID_URI,
): Promise<{ promise: Promise<unknown> }> {
  let promise!: Promise<unknown>;
  await act(async () => {
    promise = addMagnet(uri);
    await Promise.resolve();
    await Promise.resolve();
  });
  return { promise };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useMagnet", () => {
  it("starts in the idle state", () => {
    const { result } = renderHook(() => useMagnet());
    expect(result.current.torrentStatus.status).toBe("idle");
    expect(result.current.torrentStatus.error).toBeNull();
  });

  it("rejects an invalid magnet URI without touching the client", async () => {
    const { result } = renderHook(() => useMagnet());
    await expect(result.current.addMagnet("https://example.com/x")).rejects.toThrow(
      "Not a valid magnet link",
    );
    expect(getClient).not.toHaveBeenCalled();
  });

  it("resolves with one playlist item per streamable video file", async () => {
    const torrent = new FakeTorrent();
    getClient.mockResolvedValue(makeClient(torrent));

    const { result } = renderHook(() => useMagnet());
    const { promise } = await startAddMagnet(result.current.addMagnet);

    torrent.files = [
      { name: "movie.mp4", path: "movie.mp4", length: 1000, streamURL: "blob:movie" },
      { name: "readme.txt", path: "readme.txt", length: 10, streamURL: "blob:readme" },
      { name: "extra.mkv", path: "extra.mkv", length: 2000, streamURL: "blob:extra" },
    ];
    await act(async () => {
      torrent.emit("ready");
    });

    const items = (await promise) as Array<{ name: string; url: string; type: string; source: string }>;
    expect(items.map((i) => i.name)).toEqual(["extra.mkv", "movie.mp4"]);
    expect(items.every((i) => i.type === "stream" && i.source === "torrent")).toBe(true);
    expect(result.current.torrentStatus.status).toBe("ready");
  });

  it("filters out video files that have no stream URL", async () => {
    const torrent = new FakeTorrent();
    getClient.mockResolvedValue(makeClient(torrent));

    const { result } = renderHook(() => useMagnet());
    const { promise } = await startAddMagnet(result.current.addMagnet);

    torrent.files = [
      { name: "playable.mp4", path: "playable.mp4", length: 1000, streamURL: "blob:ok" },
      { name: "broken.mp4", path: "broken.mp4", length: 1000 }, // no streamURL
    ];
    await act(async () => {
      torrent.emit("ready");
    });

    const items = (await promise) as Array<{ name: string }>;
    expect(items.map((i) => i.name)).toEqual(["playable.mp4"]);
  });

  it("rejects when the torrent has video files but none are streamable", async () => {
    const torrent = new FakeTorrent();
    getClient.mockResolvedValue(makeClient(torrent));

    const { result } = renderHook(() => useMagnet());
    const { promise } = await startAddMagnet(result.current.addMagnet);

    torrent.files = [{ name: "movie.mp4", path: "movie.mp4", length: 1000 }];
    const rejection = expect(promise).rejects.toThrow(/could not be made streamable/);
    await act(async () => {
      torrent.emit("ready");
    });

    await rejection;
    expect(torrent.destroy).toHaveBeenCalled();
    expect(result.current.torrentStatus.status).toBe("error");
  });

  it("rejects when the torrent contains no video files", async () => {
    const torrent = new FakeTorrent();
    getClient.mockResolvedValue(makeClient(torrent));

    const { result } = renderHook(() => useMagnet());
    const { promise } = await startAddMagnet(result.current.addMagnet);

    torrent.files = [{ name: "readme.txt", path: "readme.txt", length: 10, streamURL: "blob:x" }];
    const rejection = expect(promise).rejects.toThrow(/No video files/);
    await act(async () => {
      torrent.emit("ready");
    });

    await rejection;
  });

  it("rejects on a torrent error event", async () => {
    const torrent = new FakeTorrent();
    getClient.mockResolvedValue(makeClient(torrent));

    const { result } = renderHook(() => useMagnet());
    const { promise } = await startAddMagnet(result.current.addMagnet);

    const rejection = expect(promise).rejects.toThrow("boom");
    await act(async () => {
      torrent.emit("error", new Error("boom"));
    });

    await rejection;
    expect(torrent.destroy).toHaveBeenCalled();
    expect(result.current.torrentStatus.status).toBe("error");
  });

  it("rejects and clears the torrent ref after the metadata timeout", async () => {
    jest.useFakeTimers();
    const torrent = new FakeTorrent();
    getClient.mockResolvedValue(makeClient(torrent));

    const { result } = renderHook(() => useMagnet());

    let promise!: Promise<unknown>;
    await act(async () => {
      promise = result.current.addMagnet(VALID_URI);
      await Promise.resolve();
      await Promise.resolve();
    });

    const rejection = expect(promise).rejects.toThrow(/Could not connect to peers/);
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    await rejection;
    expect(torrent.destroy).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("destroyMagnet destroys the active torrent and resets status", async () => {
    const torrent = new FakeTorrent();
    getClient.mockResolvedValue(makeClient(torrent));

    const { result } = renderHook(() => useMagnet());
    const { promise } = await startAddMagnet(result.current.addMagnet);
    torrent.files = [{ name: "v.mp4", path: "v.mp4", length: 1, streamURL: "blob:v" }];
    await act(async () => {
      torrent.emit("ready");
    });
    await promise;

    act(() => {
      result.current.destroyMagnet();
    });

    expect(torrent.destroy).toHaveBeenCalled();
    expect(result.current.torrentStatus.status).toBe("idle");
  });

  it("destroys the previous torrent before adding a new one", async () => {
    const first = new FakeTorrent();
    const second = new FakeTorrent();
    getClient.mockResolvedValueOnce(makeClient(first));
    getClient.mockResolvedValueOnce(makeClient(second));

    const { result } = renderHook(() => useMagnet());

    const { promise: firstPromise } = await startAddMagnet(result.current.addMagnet);
    first.files = [{ name: "a.mp4", path: "a.mp4", length: 1, streamURL: "blob:a" }];
    await act(async () => {
      first.emit("ready");
    });
    await firstPromise;
    expect(first.destroy).not.toHaveBeenCalled();

    await startAddMagnet(result.current.addMagnet);
    expect(first.destroy).toHaveBeenCalled();
  });

  it("destroys the WebTorrent client on unmount", () => {
    const { unmount } = renderHook(() => useMagnet());
    unmount();
    expect(destroyClient).toHaveBeenCalled();
  });
});
