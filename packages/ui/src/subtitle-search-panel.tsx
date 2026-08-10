"use client";

import React from "react";
import { getLanguageName, type SubtitleSearchResult } from "@lightbird/core";
import type {
  SubtitleSearchStatus,
  SubtitleSearchMode,
  SubtitleSearchRequest,
} from "@lightbird/core/react";
import { Button } from "./primitives/button";
import { Input } from "./primitives/input";
import { Label } from "./primitives/label";
import { Search, Loader2, Download, Ear, Hash, AlertCircle } from "lucide-react";
import { cn } from "./utils/cn";

export interface SubtitleSearchPanelProps {
  status: SubtitleSearchStatus;
  results: SubtitleSearchResult[];
  mode: SubtitleSearchMode | null;
  error: string | null;
  /** True when search is unavailable on this deployment — hides the whole panel. */
  unavailable?: boolean;
  /** fileId currently downloading, or null. */
  downloadingId: string | null;
  /** False when no video is loaded, which disables the search buttons. */
  canSearch: boolean;
  /**
   * False when the source has no local file to fingerprint — remote URLs and
   * torrent-backed items. Disables the hash button rather than letting it fail.
   */
  canHash?: boolean;
  /** Title to prefill the query box with, usually derived from the filename. */
  defaultQuery?: string;
  /**
   * Receives the chosen mode and the current query text. Declared with
   * parameters so a handler that ignores them stays assignable.
   */
  onSearch: (request: SubtitleSearchRequest, query: string) => void;
  onApply: (result: SubtitleSearchResult) => void;
}

/** Compact download counts: 1234 → "1.2k". */
function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

const STATUS_LABELS: Partial<Record<SubtitleSearchStatus, string>> = {
  hashing: "Fingerprinting video…",
  searching: "Searching…",
};

/**
 * Online subtitle search UI, modelled on VLC's VLSub panel.
 *
 * Results found by video hash are marked, because that distinction matters to
 * the user: a hash match is timed against this exact release and needs no sync
 * adjustment, while a filename match is a guess that often does.
 */
export function SubtitleSearchPanel({
  status,
  results,
  mode,
  error,
  unavailable = false,
  downloadingId,
  canSearch,
  canHash = true,
  defaultQuery = "",
  onSearch,
  onApply,
}: SubtitleSearchPanelProps) {
  // Re-keyed on defaultQuery so switching videos reseeds the box, while edits
  // within one video survive re-renders.
  const [query, setQuery] = React.useState(defaultQuery);
  const seededFor = React.useRef(defaultQuery);
  if (seededFor.current !== defaultQuery) {
    seededFor.current = defaultQuery;
    setQuery(defaultQuery);
  }

  // Nothing to offer when the deployment has no search backend configured.
  if (unavailable) return null;

  const busy = status === "hashing" || status === "searching";
  const trimmed = query.trim();

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Label className="text-sm font-medium">Find online</Label>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !busy && canSearch && trimmed) {
            e.preventDefault();
            onSearch("text", trimmed);
          }
        }}
        placeholder="Title to search for"
        aria-label="Title to search for"
        disabled={!canSearch}
        className="h-8 text-xs"
      />

      {/* Two explicit searches rather than one button with hidden fallback
          behaviour: a hash match and a name match are different promises about
          sync, so the user picks which one they are asking for. */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSearch("hash", trimmed)}
          disabled={busy || !canSearch || !canHash}
          title={
            canHash
              ? "Match this exact release by video fingerprint"
              : "Only local files can be fingerprinted"
          }
          className="h-7 px-2 flex-1"
        >
          {busy && status === "hashing" ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Hash className="h-3 w-3 mr-1" />
          )}
          By hash
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSearch("text", trimmed)}
          disabled={busy || !canSearch || !trimmed}
          title="Search by title — results may need a sync offset"
          className="h-7 px-2 flex-1"
        >
          {busy && status === "searching" ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Search className="h-3 w-3 mr-1" />
          )}
          By name
        </Button>
      </div>

      {busy && (
        <p className="text-xs text-muted-foreground py-1">{STATUS_LABELS[status]}</p>
      )}

      {status === "error" && error && (
        <p className="text-xs text-destructive flex items-start gap-1 py-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {status === "ready" && results.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">
          {mode === "hash"
            ? "No subtitles indexed for this exact release. Try searching by name."
            : "No subtitles found for this video."}
        </p>
      )}

      {results.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            {mode === "hash"
              ? "Matched by video hash — should be in sync."
              : "Matched by name — may need a sync offset."}
          </p>
          <div
            className="max-h-48 overflow-y-auto overscroll-contain pr-1 space-y-1"
            role="list"
          >
            {results.map((result) => {
              const isDownloading = downloadingId === result.fileId;
              return (
                // The list-item role goes on the wrapper so the button keeps
                // its native role — screen readers must announce this as an
                // action that downloads a subtitle, not as inert list text.
                <div key={result.fileId} role="listitem">
                <button
                  type="button"
                  onClick={() => onApply(result)}
                  disabled={downloadingId !== null}
                  className={cn(
                    "w-full text-left rounded-sm px-2 py-1.5 text-xs transition-colors",
                    "hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {getLanguageName(result.language)}
                    </span>
                    <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
                      {result.hashMatch && (
                        <Hash className="h-3 w-3 text-primary" aria-label="Hash match" />
                      )}
                      {result.hearingImpaired && (
                        <Ear className="h-3 w-3" aria-label="Hearing impaired" />
                      )}
                      {isDownloading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span className="truncate">{result.release || result.fileName}</span>
                    <span className="shrink-0">{formatCount(result.downloadCount)}</span>
                  </div>
                </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default SubtitleSearchPanel;
