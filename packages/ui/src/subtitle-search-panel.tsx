"use client";

import React from "react";
import { getLanguageName, type SubtitleSearchResult } from "@lightbird/core";
import type {
  SubtitleSearchStatus,
  SubtitleSearchMode,
} from "@lightbird/core/react";
import { Button } from "./primitives/button";
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
  /** False when no video is loaded, which disables the search button. */
  canSearch: boolean;
  onSearch: () => void;
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
  onSearch,
  onApply,
}: SubtitleSearchPanelProps) {
  // Nothing to offer when the deployment has no search backend configured.
  if (unavailable) return null;

  const busy = status === "hashing" || status === "searching";

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Find online</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={onSearch}
          disabled={busy || !canSearch}
          className="h-7 px-2"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Search className="h-3 w-3 mr-1" />
          )}
          Search
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
          No subtitles found for this video.
        </p>
      )}

      {results.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            {mode === "hash"
              ? "Matched by video hash — should be in sync."
              : "Matched by filename — may need a sync offset."}
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
