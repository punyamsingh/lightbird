// Minimal ambient declaration for webtorrent v2 (no official @types package).
// Only the parts used by magnet-player.ts are declared.
declare module "webtorrent" {
  import type { EventEmitter } from "events";

  interface TorrentFile extends EventEmitter {
    name: string;
    path: string;
    length: number;
    downloaded: number;
    progress: number;
    done: boolean;
    streamURL: string;
    renderTo(elem: HTMLElement): void;
  }

  interface Torrent extends EventEmitter {
    infoHash: string;
    name: string;
    files: TorrentFile[];
    numPeers: number;
    downloadSpeed: number;
    uploadSpeed: number;
    progress: number;
    downloaded: number;
    length: number;
    destroyed: boolean;
    destroy(cb?: () => void): void;
  }

  interface WebTorrentOptions {
    peerId?: string | Uint8Array;
    nodeId?: string | Uint8Array;
    maxConns?: number;
    tracker?: boolean | object;
    lsd?: boolean;
    dht?: boolean | object;
    webSeeds?: boolean;
    downloadLimit?: number;
    uploadLimit?: number;
  }

  interface AddTorrentOptions {
    announce?: string[];
    path?: string;
    skipVerify?: boolean;
  }

  interface ServerOptions {
    controller: ServiceWorkerRegistration;
  }

  class WebTorrent extends EventEmitter {
    constructor(opts?: WebTorrentOptions);
    torrents: Torrent[];
    destroyed: boolean;
    downloadSpeed: number;
    uploadSpeed: number;
    /** @internal */
    _server?: unknown;
    add(
      torrentId: string | Uint8Array | object,
      opts?: AddTorrentOptions,
      cb?: (torrent: Torrent) => void,
    ): Torrent;
    createServer(options: ServerOptions): unknown;
    destroy(cb?: () => void): void;
  }

  export default WebTorrent;
  export type { Torrent, TorrentFile, WebTorrentOptions, AddTorrentOptions };
}
