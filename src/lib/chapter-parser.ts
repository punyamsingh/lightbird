"use client";

import type { Chapter } from "@/types";

/**
 * Parses chapter data from an FFmpeg probe/log output.
 *
 * Looks for blocks like:
 *   Chapter #0:0: start 0.000000, end 142.500000
 *     Metadata:
 *       title           : Introduction
 *
 * Returns [] (never throws) on malformed or missing input.
 */
export function parseChaptersFromFFmpegLog(
  log: string,
  totalDuration: number,
): Chapter[] {
  try {
    const chapters: Chapter[] = [];

    // Match each "Chapter #N:M: start X.X, end Y.Y" line
    const chapterRegex = /Chapter #\d+:\d+:\s+start\s+([\d.]+),\s+end\s+([\d.]+)/gi;
    // Title comes right after in "Metadata: title : ..." block
    const titleRegex = /\btitle\s*:\s*(.+)/i;

    let match: RegExpExecArray | null;
    const rawChapters: { start: number; end: number; titleLine: string }[] = [];

    while ((match = chapterRegex.exec(log)) !== null) {
      const start = parseFloat(match[1]);
      const end = parseFloat(match[2]);
      // Grab the next ~3 lines after the match to look for a title
      const afterMatch = log.slice(match.index + match[0].length, match.index + match[0].length + 200);
      rawChapters.push({ start, end, titleLine: afterMatch });
    }

    if (rawChapters.length === 0) return [];

    for (let i = 0; i < rawChapters.length; i++) {
      const { start, end, titleLine } = rawChapters[i];
      const titleMatch = titleRegex.exec(titleLine);
      const title = titleMatch ? titleMatch[1].trim() : `Chapter ${i + 1}`;

      const isLast = i === rawChapters.length - 1;
      const endTime = isLast ? totalDuration : end;

      chapters.push({
        index: i,
        title,
        startTime: start,
        endTime,
      });
    }

    return chapters;
  } catch {
    return [];
  }
}

/**
 * Parses chapter data from a WebVTT chapters file.
 *
 * Each cue's identifier is the chapter title; start/end come from the
 * VTT timestamp line "HH:MM:SS.mmm --> HH:MM:SS.mmm".
 *
 * Returns [] (never throws) on malformed or empty input.
 */
export function parseChaptersFromVtt(vttText: string): Chapter[] {
  try {
    if (!vttText || vttText.trim() === "") return [];

    const chapters: Chapter[] = [];

    // Split into cue blocks (separated by blank lines)
    const blocks = vttText.split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split("\n").map((l) => l.trim());
      if (lines.length < 2) continue;

      // Skip the WEBVTT header
      if (lines[0].startsWith("WEBVTT")) continue;

      // Find the timestamp line (contains -->)
      const tsIndex = lines.findIndex((l) => l.includes("-->"));
      if (tsIndex === -1) continue;

      // The cue identifier is the line before the timestamp (if any)
      const titleLine = tsIndex > 0 ? lines[tsIndex - 1] : "";
      const title = titleLine || `Chapter ${chapters.length + 1}`;

      const tsLine = lines[tsIndex];
      const tsMatch = tsLine.match(
        /^([\d:.,]+)\s*-->\s*([\d:.,]+)/,
      );
      if (!tsMatch) continue;

      const startTime = parseVttTimestamp(tsMatch[1]);
      const endTime = parseVttTimestamp(tsMatch[2]);

      if (isNaN(startTime) || isNaN(endTime)) continue;

      chapters.push({
        index: chapters.length,
        title,
        startTime,
        endTime,
      });
    }

    return chapters;
  } catch {
    return [];
  }
}

function parseVttTimestamp(ts: string): number {
  // Accepts HH:MM:SS.mmm or MM:SS.mmm or SS.mmm
  const normalized = ts.replace(",", ".");
  const parts = normalized.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return NaN;
}
