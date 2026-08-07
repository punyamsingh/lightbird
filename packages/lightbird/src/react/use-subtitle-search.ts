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

export interface SubtitleSearchSource {
  /** The video itself. Omit for remote sources — the search falls back to text. */
  file?: Blob;
  fileName: string;
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
  /** Hashes the source when possible, then searches. Text is the fallback. */
  search: (source: SubtitleSearchSource) => Promise<void>;
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
  // Guards against setState after unmount, since a search spans several awaits.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setResults([]);
    setMode(null);
    setError(null);
    setErrorKind(null);
    setDownloadingId(null);
  }, []);

  const search = useCallback(
    async (source: SubtitleSearchSource) => {
      // Supersede any in-flight search.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setErrorKind(null);
      setResults([]);
      setMode(null);

      const requestOptions = { endpoint, signal: controller.signal };

      try {
        let hash: string | undefined;
        let fileSize: number | undefined;

        if (source.file && isHashable(source.file)) {
          setStatus("hashing");
          hash = await computeOpenSubtitlesHash(source.file);
          fileSize = source.file.size;
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

        // Nothing (or nothing to hash) — fall back to the filename.
        if (found.length === 0) {
          const text = fileNameToSearchQuery(source.fileName);
          if (text) {
            found = await searchSubtitles({ text, languages }, requestOptions);
            usedMode = "text";
          }
        }

        if (controller.signal.aborted || !mountedRef.current) return;

        setResults(found);
        setMode(found.length > 0 ? usedMode : null);
        setStatus("ready");

        if (found.length > 0) {
          onSuccess?.(
            usedMode === "hash"
              ? `Found ${found.length} subtitle(s) matching this exact release`
              : `Found ${found.length} subtitle(s) by filename — check sync`
          );
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError" || !mountedRef.current) return;
        const { message, kind } = messageFor(err);
        setError(message);
        setErrorKind(kind);
        setStatus("error");
        onError?.(message);
      }
    },
    [endpoint, languages, onError, onSuccess]
  );

  const download = useCallback(
    async (result: SubtitleSearchResult): Promise<DownloadedSubtitle> => {
      setDownloadingId(result.fileId);
      try {
        return await downloadSubtitle(result, { endpoint });
      } catch (err) {
        const { message } = messageFor(err);
        onError?.(message);
        throw new Error(message);
      } finally {
        if (mountedRef.current) setDownloadingId(null);
      }
    },
    [endpoint, onError]
  );

  return { status, results, mode, error, errorKind, downloadingId, search, download, reset };
}
