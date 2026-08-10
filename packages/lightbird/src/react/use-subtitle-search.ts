"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  computeOpenSubtitlesHash,
  isHashable,
  fileNameToSearchQuery,
} from "../subtitles/opensubtitles-hash";
import {
  searchSubtitles,
  downloadSubtitle,
  SubtitleSearchError,
  type SubtitleSearchErrorKind,
  type DownloadedSubtitle,
} from "../subtitles/subtitle-search";
import type { SubtitleSearchResult } from "../types";

export type SubtitleSearchStatus =
  | "idle"
  /** Reading the first and last 64 KiB to fingerprint the video. */
  | "hashing"
  | "searching"
  | "ready"
  | "error";

/** Which query produced the current results. */
export type SubtitleSearchMode = "hash" | "text";

/**
 * Which search to run, mirroring VLSub's two buttons.
 *
 * - `auto` — hash first, filename only if the hash finds nothing.
 * - `hash` — fingerprint only; no silent fallback, so an empty result is
 *   information ("this release is not indexed") rather than a mystery.
 * - `text` — filename or a caller-supplied title only; never reads the file.
 */
export type SubtitleSearchRequest = "auto" | "hash" | "text";

export interface SubtitleSearchSource {
  /** The video itself. Omit for remote sources — only a text search is possible. */
  file?: Blob;
  fileName: string;
  /**
   * Title to search for, overriding the one derived from `fileName`. Release
   * filenames are often a poor query ("Blade.Runner.2049.2160p.HDR.x265"), so
   * the UI lets the user correct it — the same as VLSub's editable title.
   */
  query?: string;
}

export interface UseSubtitleSearchOptions {
  /** Proxy prefix. Defaults to `/api/subtitles`. */
  endpoint?: string;
  /** ISO 639-1 codes to filter by. Empty or omitted means all languages. */
  languages?: string[];
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export interface UseSubtitleSearchReturn {
  status: SubtitleSearchStatus;
  results: SubtitleSearchResult[];
  /** How the current results were found, or null before a successful search. */
  mode: SubtitleSearchMode | null;
  error: string | null;
  errorKind: SubtitleSearchErrorKind | null;
  /** fileId currently being downloaded, or null. */
  downloadingId: string | null;
  /**
   * Runs a search. Defaults to `auto` (hash, then filename); pass `hash` or
   * `text` to run exactly one, as VLSub's two buttons do.
   */
  search: (source: SubtitleSearchSource, request?: SubtitleSearchRequest) => Promise<void>;
  /** Fetches a result's subtitle text. Throws with a user-facing message. */
  download: (result: SubtitleSearchResult) => Promise<DownloadedSubtitle>;
  reset: () => void;
}

function messageFor(error: unknown): { message: string; kind: SubtitleSearchErrorKind } {
  if (error instanceof SubtitleSearchError) {
    return { message: error.message, kind: error.kind };
  }
  return { message: (error as Error)?.message || "Subtitle search failed", kind: "failed" };
}

/**
 * Online subtitle search, the VLSub loop: fingerprint the video, ask the
 * provider for subtitles timed against that exact release, fall back to a
 * filename search when the hash is unknown.
 */
export function useSubtitleSearch(
  options: UseSubtitleSearchOptions = {}
): UseSubtitleSearchReturn {
  const { endpoint, languages, onError, onSuccess } = options;

  const [status, setStatus] = useState<SubtitleSearchStatus>("idle");
  const [results, setResults] = useState<SubtitleSearchResult[]>([]);
  const [mode, setMode] = useState<SubtitleSearchMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<SubtitleSearchErrorKind | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  // Downloads get their own controller: a download is cancelled by the same
  // events that cancel a search (video change, unmount), but it must not be
  // aborted merely because a newer *search* superseded the current one.
  const downloadAbortRef = useRef<AbortController | null>(null);
  // Guards against setState after unmount, since a search spans several awaits.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      downloadAbortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    downloadAbortRef.current?.abort();
    downloadAbortRef.current = null;
    setStatus("idle");
    setResults([]);
    setMode(null);
    setError(null);
    // "unavailable" describes the deployment, not the video, so it survives a
    // reset. Clearing it would make the search UI reappear on every video
    // change and let the user re-discover the same missing backend each time.
    setErrorKind((prev) => (prev === "unavailable" ? prev : null));
    setDownloadingId(null);
  }, []);

  const search = useCallback(
    async (source: SubtitleSearchSource, request: SubtitleSearchRequest = "auto") => {
      // Supersede any in-flight search.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setErrorKind(null);
      setResults([]);
      setMode(null);

      const requestOptions = { endpoint, signal: controller.signal };
      const hashable = Boolean(source.file && isHashable(source.file));

      try {
        // Asking for a hash match on something that cannot be fingerprinted is
        // a dead end, and silently searching by name instead would misrepresent
        // the results as release-matched. Say so and let the user choose.
        if (request === "hash" && !hashable) {
          throw new SubtitleSearchError(
            "failed",
            "This source can't be fingerprinted — search by name instead"
          );
        }

        let hash: string | undefined;
        let fileSize: number | undefined;

        if (request !== "text" && hashable) {
          setStatus("hashing");
          hash = await computeOpenSubtitlesHash(source.file as Blob);
          fileSize = (source.file as Blob).size;
        }

        if (controller.signal.aborted) return;
        setStatus("searching");

        let found: SubtitleSearchResult[] = [];
        let usedMode: SubtitleSearchMode = "text";

        // Hash first: those results are timed against this exact release.
        if (hash) {
          found = await searchSubtitles({ hash, fileSize, languages }, requestOptions);
          if (found.length > 0) usedMode = "hash";
        }

        // Fall back to the title — but only when the caller left the choice
        // open. An explicit hash search reports "nothing indexed" instead.
        if (found.length === 0 && request !== "hash") {
          const text = (source.query ?? fileNameToSearchQuery(source.fileName)).trim();
          if (text) {
            found = await searchSubtitles({ text, languages }, requestOptions);
            usedMode = "text";
          }
        }

        if (controller.signal.aborted || !mountedRef.current) return;

        setResults(found);
        // Report the mode that was *attempted*, not just the one that found
        // something: an empty hash search still needs to be labelled a hash
        // search so the UI can suggest searching by name.
        setMode(found.length > 0 ? usedMode : request === "hash" ? "hash" : null);
        setStatus("ready");

        if (found.length > 0) {
          onSuccess?.(
            usedMode === "hash"
              ? `Found ${found.length} subtitle(s) matching this exact release`
              : `Found ${found.length} subtitle(s) by name — check sync`
          );
        }
      } catch (err) {
        // A superseded search must stay silent even when its failure is not an
        // AbortError — hashing or the request can reject on its own after the
        // newer search has already aborted this controller.
        if (
          controller.signal.aborted ||
          (err as Error)?.name === "AbortError" ||
          !mountedRef.current
        ) {
          return;
        }
        const { message, kind } = messageFor(err);
        setError(message);
        setErrorKind(kind);
        setStatus("error");
        // A deployment with no search backend is not a failure the user caused
        // or can act on. The UI hides the panel on this kind; a toast would
        // just be noise they cannot do anything about.
        if (kind !== "unavailable") onError?.(message);
      }
    },
    [endpoint, languages, onError, onSuccess]
  );

  const download = useCallback(
    async (result: SubtitleSearchResult): Promise<DownloadedSubtitle> => {
      downloadAbortRef.current?.abort();
      const controller = new AbortController();
      downloadAbortRef.current = controller;

      setDownloadingId(result.fileId);
      try {
        return await downloadSubtitle(result, { endpoint, signal: controller.signal });
      } catch (err) {
        // Cancellation propagates as an AbortError so the caller can tell
        // "the user moved on" from "the download actually failed", and no
        // error toast fires for the former.
        if ((err as Error)?.name === "AbortError") throw err;
        // The signal check matters on its own: a generic rejection can already
        // be queued when reset() or a replacement download aborts this
        // controller, and reporting that as a failure would toast the user for
        // a download they themselves cancelled.
        if (controller.signal.aborted) {
          throw Object.assign(new Error("Subtitle download was cancelled"), {
            name: "AbortError",
          });
        }
        const { message } = messageFor(err);
        onError?.(message);
        throw new Error(message);
      } finally {
        if (mountedRef.current && downloadAbortRef.current === controller) {
          downloadAbortRef.current = null;
          setDownloadingId(null);
        }
      }
    },
    [endpoint, onError]
  );

  return { status, results, mode, error, errorKind, downloadingId, search, download, reset };
}
