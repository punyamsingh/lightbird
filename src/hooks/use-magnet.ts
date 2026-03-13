"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  isMagnetUri,
  getVideoFiles,
  getWebTorrentClient,
  destroyWebTorrentClient,
  DEFAULT_TRACKERS,
} from "@/lib/magnet-player";
import type { PlaylistItem, TorrentStatus } from "@/types";

const METADATA_TIMEOUT_MS = 30_000;

const INITIAL_STATUS: TorrentStatus = {
  status: "idle",
  torrentName: "",
  numPeers: 0,
  downloadSpeed: 0,
  uploadSpeed: 0,
  progress: 0,
  error: null,
};

export interface UseMagnetReturn {
  torrentStatus: TorrentStatus;
  /**
   * Resolves with the playlist items (one per video file in the torrent).
   * Throws an Error with a user-facing message on failure.
   */
  addMagnet: (uri: string) => Promise<PlaylistItem[]>;
  /** Destroys the active torrent. */
  destroyMagnet: () => void;
}

export function useMagnet(): UseMagnetReturn {
  const [torrentStatus, setTorrentStatus] = useState<TorrentStatus>(INITIAL_STATUS);

  const activeTorrentRef = useRef<import("webtorrent").Torrent | null>(null);

  // Destroy the client on unmount
  useEffect(() => {
    return () => {
      destroyWebTorrentClient();
    };
  }, []);

  const destroyMagnet = useCallback(() => {
    if (activeTorrentRef.current && !activeTorrentRef.current.destroyed) {
      activeTorrentRef.current.destroy();
    }
    activeTorrentRef.current = null;
    setTorrentStatus(INITIAL_STATUS);
  }, []);

  const addMagnet = useCallback(async (uri: string): Promise<PlaylistItem[]> => {
    if (!isMagnetUri(uri)) {
      throw new Error("Not a valid magnet link");
    }

    setTorrentStatus({
      ...INITIAL_STATUS,
      status: "loading-metadata",
      error: null,
    });

    let client: Awaited<ReturnType<typeof getWebTorrentClient>>;
    try {
      client = await getWebTorrentClient();
    } catch {
      const msg = "Could not initialise torrent client";
      setTorrentStatus((s) => ({ ...s, status: "error", error: msg }));
      throw new Error(msg);
    }

    return new Promise<PlaylistItem[]>((resolve, reject) => {
      let settled = false;
      let torrent: import("webtorrent").Torrent | undefined;

      // Guard: ensures only the first resolution/rejection path runs
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const timeout = setTimeout(() => {
        settle(() => {
          torrent?.destroy?.();
          const msg = "Could not connect to peers. Check the link and try again.";
          setTorrentStatus((s) => ({ ...s, status: "error", error: msg }));
          reject(new Error(msg));
        });
      }, METADATA_TIMEOUT_MS);

      try {
        torrent = client.add(uri.trim(), { announce: DEFAULT_TRACKERS });
        activeTorrentRef.current = torrent;
      } catch (err) {
        settle(() => {
          clearTimeout(timeout);
          const msg = "Failed to add torrent";
          setTorrentStatus((s) => ({ ...s, status: "error", error: msg }));
          reject(new Error(msg));
        });
        return;
      }

      torrent.on("error", (err: Error) => {
        settle(() => {
          clearTimeout(timeout);
          const msg = err?.message ?? "Torrent error";
          setTorrentStatus((s) => ({ ...s, status: "error", error: msg }));
          reject(new Error(msg));
        });
      });

      torrent.on("ready", () => {
        clearTimeout(timeout);

        const videoFiles = getVideoFiles(torrent);

        if (videoFiles.length === 0) {
          settle(() => {
            torrent.destroy();
            activeTorrentRef.current = null;
            const msg = "No video files found in this torrent";
            setTorrentStatus((s) => ({ ...s, status: "error", error: msg }));
            reject(new Error(msg));
          });
          return;
        }

        settle(() => {
          setTorrentStatus((s) => ({
            ...s,
            status: "ready",
            torrentName: torrent.name ?? "",
            progress: torrent.progress ?? 0,
          }));

          // Build playlist items using the SW-backed stream URL for each file
          const items: PlaylistItem[] = videoFiles.map((file) => ({
            id: crypto.randomUUID(),
            name: file.name,
            url: (file as { streamURL?: string }).streamURL ?? "",
            type: "stream" as const,
            source: "torrent" as const,
            duration: undefined,
          }));

          resolve(items);
        });

        // Live progress updates
        torrent.on("download", () => {
          setTorrentStatus((s) => ({
            ...s,
            numPeers: torrent.numPeers ?? 0,
            downloadSpeed: torrent.downloadSpeed ?? 0,
            uploadSpeed: torrent.uploadSpeed ?? 0,
            progress: torrent.progress ?? 0,
          }));
        });

        torrent.on("done", () => {
          setTorrentStatus((s) => ({ ...s, progress: 1 }));
        });

        torrent.on("wire", () => {
          setTorrentStatus((s) => ({
            ...s,
            numPeers: torrent.numPeers ?? 0,
          }));
        });
      });
    });
  }, []);

  return { torrentStatus, addMagnet, destroyMagnet };
}
