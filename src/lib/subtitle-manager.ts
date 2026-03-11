"use client";

import type { Subtitle, SubtitleCue } from "@/types";
import { SubtitleConverter } from "./subtitle-converter";
import { applyOffsetToVtt, createOffsetVttUrl } from "./subtitle-offset";

// chardet runs fine in both Node and browser (via Buffer polyfill in Next.js)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chardet = require("chardet") as typeof import("chardet");

/** Reads a File, auto-detecting its text encoding, and returns the decoded string. */
async function readSubtitleFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const detected = chardet.detect(Buffer.from(bytes)) ?? "UTF-8";
  const decoder = new TextDecoder(detected);
  return decoder.decode(buffer);
}

/** Parses a VTT string into an array of SubtitleCue objects for search. */
export function parseVttCues(vttText: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // Match cue blocks: timestamp line followed by text
  const cueRegex =
    /(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})[^\n]*\n([\s\S]*?)(?=\n\n|\n*$)/g;
  let match: RegExpExecArray | null;
  while ((match = cueRegex.exec(vttText)) !== null) {
    const startTime = timestampToSeconds(match[1]);
    const endTime = timestampToSeconds(match[2]);
    const text = match[3].trim().replace(/<[^>]+>/g, ""); // strip VTT inline tags
    if (text) cues.push({ startTime, endTime, text });
  }
  return cues;
}

function timestampToSeconds(ts: string): number {
  const parts = ts.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const s = Number(parts[2]);
  return h * 3600 + m * 60 + s;
}

interface SubtitleRecord {
  subtitle: Subtitle;
  /** Raw VTT text (undefined for ASS/SSA entries). */
  rawVtt: string | undefined;
  /** Currently applied offset in seconds. */
  offset: number;
  /** Parsed cue index for search (only for VTT/SRT). */
  cues: SubtitleCue[];
}

export class UniversalSubtitleManager {
  private records: SubtitleRecord[] = [];
  private videoElement: HTMLVideoElement | null = null;
  private nextId = 0;

  constructor(videoElement?: HTMLVideoElement) {
    this.videoElement = videoElement || null;
  }

  setVideoElement(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async addSubtitleFiles(files: File[]): Promise<Subtitle[]> {
    const newSubtitles: Subtitle[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() as
        | "vtt"
        | "srt"
        | "ass"
        | "ssa"
        | undefined;

      const langMatch = file.name.match(/\.([a-z]{2,3})\.(?:srt|vtt|ass|ssa)$/i);
      const lang = langMatch ? langMatch[1] : "unknown";

      const subtitle: Subtitle = {
        id: String(this.nextId++),
        name: `${lang.toUpperCase()} (${file.name})`,
        lang,
        type: "external",
        format: ext ?? "vtt",
      };

      let rawVtt: string | undefined;
      let cues: SubtitleCue[] = [];

      if (ext === "ass" || ext === "ssa") {
        // ASS/SSA: store raw text, mark url as undefined (handled by ASSRenderer in player)
        const rawText = await readSubtitleFile(file);
        subtitle.url = undefined;
        // Store the raw ASS text in a data URL so the player can retrieve it
        const blob = new Blob([rawText], { type: "text/plain" });
        subtitle.url = URL.createObjectURL(blob);
        rawVtt = undefined;
      } else {
        // VTT/SRT: read with encoding detection, then convert to VTT
        const fileText = await readSubtitleFile(file);
        let vttText: string;
        if (ext === "srt") {
          vttText = await SubtitleConverter.convertSrtToVtt(fileText);
        } else {
          vttText = fileText;
        }
        rawVtt = vttText;
        cues = parseVttCues(vttText);
        const blob = new Blob([vttText], { type: "text/vtt" });
        subtitle.url = URL.createObjectURL(blob);
      }

      newSubtitles.push(subtitle);
      this.records.push({ subtitle, rawVtt, offset: 0, cues });

      // Add track element for VTT/SRT subtitles
      if (this.videoElement && ext !== "ass" && ext !== "ssa" && subtitle.url) {
        const track = document.createElement("track");
        track.kind = "subtitles";
        track.label = subtitle.name;
        track.srclang = subtitle.lang;
        track.src = subtitle.url;
        track.setAttribute("data-id", subtitle.id);
        track.default = false;

        track.addEventListener("load", () => {
          console.log(`Subtitle track loaded: ${subtitle.name}`);
        });
        track.addEventListener("error", (e) => {
          console.error(`Failed to load subtitle track: ${subtitle.name}`, e);
        });

        this.videoElement.appendChild(track);
        const textTrack = track.track;
        textTrack.mode = "hidden";
        setTimeout(() => {
          textTrack.mode = "disabled";
        }, 100);
      }
    }

    return newSubtitles;
  }

  removeSubtitle(id: string): boolean {
    const index = this.records.findIndex((r) => r.subtitle.id === id);
    if (index === -1) return false;

    const { subtitle } = this.records[index];

    if (this.videoElement) {
      const tracks = this.videoElement.querySelectorAll("track");
      for (const track of tracks) {
        if (track.getAttribute("data-id") === id) {
          track.remove();
          break;
        }
      }
    }

    if (subtitle.url && subtitle.url.startsWith("blob:")) {
      URL.revokeObjectURL(subtitle.url);
    }

    this.records.splice(index, 1);
    return true;
  }

  switchSubtitle(id: string): void {
    if (!this.videoElement) return;

    const tracks = this.videoElement.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = "disabled";
    }

    if (id === "-1") return;

    const trackElements = this.videoElement.querySelectorAll("track");
    for (let i = 0; i < trackElements.length; i++) {
      const trackElement = trackElements[i] as HTMLTrackElement;
      if (trackElement.getAttribute("data-id") === id) {
        const textTrack = tracks[i];
        if (textTrack) {
          if (trackElement.readyState === 2) {
            textTrack.mode = "showing";
          } else {
            const onLoad = () => {
              textTrack.mode = "showing";
              trackElement.removeEventListener("load", onLoad);
            };
            trackElement.addEventListener("load", onLoad);
            textTrack.mode = "hidden";
            setTimeout(() => {
              textTrack.mode = "showing";
            }, 100);
          }
        }
        break;
      }
    }
  }

  /**
   * Sets a time offset (in seconds) for a VTT/SRT subtitle.
   * Regenerates the blob URL with shifted timestamps and updates the track element.
   */
  async setOffset(id: string, offsetSeconds: number): Promise<void> {
    const record = this.records.find((r) => r.subtitle.id === id);
    if (!record || record.rawVtt === undefined) return;
    if (record.offset === offsetSeconds) return;

    record.offset = offsetSeconds;

    // Revoke old URL
    if (record.subtitle.url && record.subtitle.url.startsWith("blob:")) {
      URL.revokeObjectURL(record.subtitle.url);
    }

    // Build new blob URL with shifted timestamps
    const shifted = applyOffsetToVtt(record.rawVtt, offsetSeconds);
    const blob = new Blob([shifted], { type: "text/vtt" });
    const newUrl = URL.createObjectURL(blob);
    record.subtitle.url = newUrl;

    // Update the track element src
    if (this.videoElement) {
      const trackElements = this.videoElement.querySelectorAll("track");
      for (const trackEl of trackElements) {
        if (trackEl.getAttribute("data-id") === id) {
          trackEl.src = newUrl;
          break;
        }
      }
    }
  }

  /** Returns parsed cue index for a subtitle (empty array for ASS/SSA). */
  getCues(id: string): SubtitleCue[] {
    return this.records.find((r) => r.subtitle.id === id)?.cues ?? [];
  }

  /** Returns cues for all loaded VTT/SRT subtitles merged, for global search. */
  getAllCues(): SubtitleCue[] {
    return this.records.flatMap((r) => r.cues);
  }

  getSubtitles(): Subtitle[] {
    return this.records.map((r) => r.subtitle);
  }

  clearSubtitles(): void {
    for (const { subtitle } of this.records) {
      if (subtitle.url && subtitle.url.startsWith("blob:")) {
        URL.revokeObjectURL(subtitle.url);
      }
    }
    if (this.videoElement) {
      const tracks = this.videoElement.querySelectorAll("track");
      tracks.forEach((track) => track.remove());
    }
    this.records = [];
  }

  destroy(): void {
    this.clearSubtitles();
    this.videoElement = null;
  }

  importSubtitles(subtitles: Subtitle[]): void {
    this.records = subtitles.map((s) => ({
      subtitle: s,
      rawVtt: undefined,
      offset: 0,
      cues: [],
    }));
    this.nextId = Math.max(...subtitles.map((s) => parseInt(s.id)), 0) + 1;
  }
}
