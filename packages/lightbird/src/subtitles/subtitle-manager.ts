import type { Subtitle, SubtitleCue } from "../types";
import { SubtitleConverter } from "./subtitle-converter";
import { applyOffsetToVtt, createOffsetVttUrl } from "./subtitle-offset";

/**
 * Simple BOM / encoding detection for subtitle files.
 * Checks for UTF-8 BOM, UTF-16 LE/BE BOMs, and falls back to UTF-8.
 * This avoids depending on chardet (Node.js-only) in browser bundles.
 */
function detectEncoding(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return "UTF-8";
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return "UTF-16LE";
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return "UTF-16BE";
  }
  return "UTF-8";
}

/** Reads a File, auto-detecting its text encoding, and returns the decoded string. */
async function readSubtitleFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const detected = detectEncoding(bytes);
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

/** The subtitle formats the manager understands, for runtime narrowing. */
const SUBTITLE_FORMATS = ["vtt", "srt", "ass", "ssa"] as const;

export class UniversalSubtitleManager {
  private records: SubtitleRecord[] = [];
  private videoElement: HTMLVideoElement | null = null;
  private nextId = 0;
  /** Currently selected subtitle id, or "-1" for none. */
  private activeId = "-1";

  constructor(videoElement?: HTMLVideoElement) {
    this.videoElement = videoElement || null;
  }

  setVideoElement(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async addSubtitleFiles(files: File[]): Promise<Subtitle[]> {
    const newSubtitles: Subtitle[] = [];

    for (const file of files) {
      // Narrowed rather than cast: a cast would let `movie.txt` through as
      // format "txt", which is outside the Subtitle union, counts as timed
      // text, and so gets attached as VTT without conversion. Anything
      // unrecognised falls back to "vtt" below.
      const raw = file.name.split(".").pop()?.toLowerCase();
      const ext = SUBTITLE_FORMATS.find((f) => f === raw);

      const langMatch = file.name.match(/\.([a-z]{2,3})\.(?:srt|vtt|ass|ssa)$/i);
      const lang = langMatch ? langMatch[1] : "unknown";

      // Read with encoding detection before handing off to the shared registration path.
      const text = await readSubtitleFile(file);
      newSubtitles.push(
        this.registerSubtitle({
          displayName: `${lang.toUpperCase()} (${file.name})`,
          lang,
          format: ext ?? "vtt",
          text: await this.toVttIfNeeded(text, ext ?? "vtt"),
          isTimedText: ext !== "ass" && ext !== "ssa",
        })
      );
    }

    return newSubtitles;
  }

  /**
   * Adds a subtitle from raw text rather than a File — used by the online
   * subtitle search, where the content arrives over the network already
   * decoded. Behaves identically to a file drop from here on: SRT is converted
   * to VTT, a track element is attached, and offset/search work as usual.
   */
  async addSubtitleFromText(
    content: string,
    fileName: string,
    lang: string,
    format: "vtt" | "srt" | "ass" | "ssa" = "srt"
  ): Promise<Subtitle> {
    const label = lang && lang !== "unknown" ? lang.toUpperCase() : "SUB";
    return this.registerSubtitle({
      displayName: `${label} (${fileName})`,
      lang: lang || "unknown",
      format,
      text: await this.toVttIfNeeded(content, format),
      isTimedText: format !== "ass" && format !== "ssa",
    });
  }

  /** Converts SRT source text to VTT; leaves every other format untouched. */
  private async toVttIfNeeded(text: string, format: string): Promise<string> {
    return format === "srt" ? SubtitleConverter.convertSrtToVtt(text) : text;
  }

  /**
   * Creates the Subtitle record, its blob URL, and (for timed text) the
   * `<track>` element on the video. Shared by the file and network paths.
   */
  private registerSubtitle(input: {
    displayName: string;
    lang: string;
    format: "vtt" | "srt" | "ass" | "ssa";
    /** Already VTT for timed text; raw ASS/SSA otherwise. */
    text: string;
    isTimedText: boolean;
  }): Subtitle {
    const { displayName, lang, format, text, isTimedText } = input;

    const subtitle: Subtitle = {
      id: String(this.nextId++),
      name: displayName,
      lang,
      type: "external",
      format,
    };

    let rawVtt: string | undefined;
    let cues: SubtitleCue[] = [];

    if (isTimedText) {
      rawVtt = text;
      cues = parseVttCues(text);
      subtitle.url = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
    } else {
      // ASS/SSA: keep the raw text addressable so ASSRenderer can fetch it.
      subtitle.url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    }

    this.records.push({ subtitle, rawVtt, offset: 0, cues });

    if (this.videoElement && isTimedText && subtitle.url) {
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = subtitle.name;
      track.srclang = subtitle.lang;
      track.src = subtitle.url;
      track.setAttribute("data-id", subtitle.id);
      track.default = false;

      track.addEventListener("error", (e) => {
        console.error(`Failed to load subtitle track: ${subtitle.name}`, e);
      });

      this.videoElement.appendChild(track);
      const textTrack = track.track;
      // Briefly hidden so the browser fetches and parses the cues, then
      // disabled — but only if the caller has not activated this subtitle in
      // the meantime. addSubtitleFromText() selects immediately, and without
      // this guard the timer would switch off the track the user just got.
      textTrack.mode = "hidden";
      setTimeout(() => {
        if (this.activeId !== subtitle.id) {
          textTrack.mode = "disabled";
        }
      }, 100);
    }

    return subtitle;
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
    if (this.activeId === id) this.activeId = "-1";
    return true;
  }

  switchSubtitle(id: string): void {
    // Recorded before the early return so a detached manager still reports the
    // right selection once a video element is attached.
    this.activeId = id;
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
        const textTrack = trackElement.track;
        if (textTrack) {
          if (trackElement.readyState === 2) {
            textTrack.mode = "hidden";
          } else {
            const onLoad = () => {
              textTrack.mode = "hidden";
              trackElement.removeEventListener("load", onLoad);
            };
            trackElement.addEventListener("load", onLoad);
            textTrack.mode = "hidden";
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
    this.activeId = "-1";
  }

  destroy(): void {
    this.clearSubtitles();
    this.videoElement = null;
  }

  importSubtitles(subtitles: Subtitle[]): void {
    // Every record is replaced, so the previous selection no longer refers to
    // anything. Left stale, it could collide with a later registration's id and
    // make the delayed disable in registerSubtitle() skip a track the user
    // never chose. removeSubtitle() and clearSubtitles() reset it for the same
    // reason.
    this.activeId = "-1";
    this.records = subtitles.map((s) => ({
      subtitle: s,
      rawVtt: undefined,
      offset: 0,
      cues: [],
    }));
    this.nextId = Math.max(...subtitles.map((s) => parseInt(s.id)), 0) + 1;
  }
}
