"use client";

import type WebTorrent from "webtorrent";

// ─── Constants ────────────────────────────────────────────────────────────────

export const VIDEO_EXTENSIONS = [
  "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v",
  "ts", "m2ts", "ogv", "ogg", "divx", "xvid", "rmvb", "rm",
];

export const DEFAULT_TRACKERS = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.btorrent.xyz",
  "wss://tracker.fastcast.nz",
];

export const DISCLAIMER_KEY = "lightbird_magnet_disclaimer_accepted";

// ─── Pure Utilities ────────────────────────────────────────────────────────────

/**
 * Returns true if the given string is a valid magnet URI.
 */
export function isMagnetUri(str: unknown): boolean {
  if (typeof str !== "string" || !str.trim()) return false;
  return /^magnet:\?xt=urn:bt(ih|mh):[a-zA-Z0-9]{20,}/i.test(str.trim());
}

/**
 * Returns true if the filename has a recognised video extension.
 */
export function isVideoFile(name: unknown): boolean {
  if (typeof name !== "string" || !name) return false;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Filters and returns all video files from a torrent, sorted by path.
 */
export function getVideoFiles(
  torrent: { files: Array<{ name: string; path: string; length: number }> },
): Array<{ name: string; path: string; length: number }> {
  return [...torrent.files]
    .filter((f) => isVideoFile(f.name))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Returns true if the user has already accepted the magnet disclaimer.
 */
export function hasAcceptedDisclaimer(): boolean {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Persists the user's acceptance of the magnet disclaimer.
 */
export function acceptDisclaimer(): void {
  try {
    localStorage.setItem(DISCLAIMER_KEY, "true");
  } catch {
    // Ignore storage errors
  }
}

// ─── WebTorrent Client Singleton ──────────────────────────────────────────────

let wtClient: InstanceType<typeof WebTorrent> | null = null;
let swPromise: Promise<ServiceWorkerRegistration> | null = null;

/**
 * Registers (or reuses) the WebTorrent service worker.
 * The SW handles streaming torrent data to the <video> element.
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (swPromise) return swPromise;

  swPromise = (async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported in this browser");
    }

    // Reuse an already-active registration
    const existing = await navigator.serviceWorker.getRegistration("/webtorrent-sw.js");
    if (existing?.active) return existing;

    const reg = await navigator.serviceWorker.register("/webtorrent-sw.js", {
      scope: "/",
    });

    if (reg.active) return reg;

    // Wait for the SW to activate
    return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
      const sw = reg.installing ?? reg.waiting;
      if (!sw) {
        if (reg.active) return resolve(reg);
        return reject(new Error("No service worker found after registration"));
      }
      const onStateChange = () => {
        if (sw.state === "activated") {
          sw.removeEventListener("statechange", onStateChange);
          resolve(reg);
        } else if (sw.state === "redundant") {
          sw.removeEventListener("statechange", onStateChange);
          reject(new Error("Service worker became redundant during activation"));
        }
      };
      sw.addEventListener("statechange", onStateChange);
    });
  })();

  return swPromise;
}

/**
 * Returns the lazy singleton WebTorrent client, creating it if necessary.
 * Sets up the local streaming server backed by the service worker.
 */
export async function getWebTorrentClient(): Promise<InstanceType<typeof WebTorrent>> {
  if (wtClient && !wtClient.destroyed) return wtClient;

  const { default: WebTorrentClass } = await import("webtorrent");
  const client = new WebTorrentClass();
  wtClient = client;

  try {
    const registration = await ensureServiceWorker();
    if (!client._server) {
      client.createServer({ controller: registration });
    }
  } catch (err) {
    // Non-fatal: streaming URL will be unavailable but torrent downloading still works.
    console.warn("[magnet-player] Service worker setup failed:", err);
  }

  return client;
}

/**
 * Destroys the WebTorrent client singleton (call on component unmount).
 */
export function destroyWebTorrentClient(): void {
  if (wtClient && !wtClient.destroyed) {
    wtClient.destroy();
  }
  wtClient = null;
  // Keep swPromise so the SW stays registered for the session.
}
