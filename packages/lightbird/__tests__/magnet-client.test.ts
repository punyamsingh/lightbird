// Mock the (ESM-only) webtorrent module so the dynamic import resolves.
const mockWebTorrent = jest.fn(() => ({
  destroyed: false,
  _server: undefined as unknown,
  createServer: jest.fn(),
  destroy: jest.fn(function (this: { destroyed: boolean }) {
    this.destroyed = true;
  }),
}));

jest.mock("webtorrent", () => ({ __esModule: true, default: mockWebTorrent }));

import { getWebTorrentClient, destroyWebTorrentClient } from "../src/magnet-player";

describe("getWebTorrentClient", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockWebTorrent.mockClear();
    // jsdom has no service worker — silence the expected setup warning.
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    destroyWebTorrentClient();
    warnSpy.mockRestore();
  });

  it("creates a single shared client for concurrent callers", async () => {
    const [a, b, c] = await Promise.all([
      getWebTorrentClient(),
      getWebTorrentClient(),
      getWebTorrentClient(),
    ]);

    expect(mockWebTorrent).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("reuses the existing client on subsequent calls", async () => {
    const first = await getWebTorrentClient();
    const second = await getWebTorrentClient();

    expect(first).toBe(second);
    expect(mockWebTorrent).toHaveBeenCalledTimes(1);
  });

  it("creates a fresh client after the previous one is destroyed", async () => {
    const first = await getWebTorrentClient();
    destroyWebTorrentClient();
    const second = await getWebTorrentClient();

    expect(first).not.toBe(second);
    expect(mockWebTorrent).toHaveBeenCalledTimes(2);
  });
});
