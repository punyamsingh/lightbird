import {
  parseChaptersFromFFmpegLog,
  parseChaptersFromVtt,
} from "@/lib/chapter-parser";

describe("parseChaptersFromFFmpegLog", () => {
  const ffmpegLog3Chapters = `
Input #0, matroska,webm, from 'sample.mkv':
  Metadata:
    title           : Sample
  Duration: 00:10:00.00, start: 0.000000, bitrate: 1234 kb/s
    Chapter #0:0: start 0.000000, end 142.500000
      Metadata:
        title           : Introduction
    Chapter #0:1: start 142.500000, end 300.000000
      Metadata:
        title           : Act 1
    Chapter #0:2: start 300.000000, end 600.000000
      Metadata:
        title           : Credits
  Stream #0:0: Video: h264
`;

  it("parses 3 chapters from an FFmpeg log block", () => {
    const chapters = parseChaptersFromFFmpegLog(ffmpegLog3Chapters, 600);
    expect(chapters).toHaveLength(3);

    expect(chapters[0]).toMatchObject({
      index: 0,
      title: "Introduction",
      startTime: 0,
      endTime: 142.5,
    });
    expect(chapters[1]).toMatchObject({
      index: 1,
      title: "Act 1",
      startTime: 142.5,
      endTime: 300,
    });
    expect(chapters[2]).toMatchObject({
      index: 2,
      title: "Credits",
      startTime: 300,
    });
  });

  it("last chapter endTime equals totalDuration", () => {
    const chapters = parseChaptersFromFFmpegLog(ffmpegLog3Chapters, 700);
    expect(chapters[2].endTime).toBe(700);
  });

  it("returns [] for a log with no chapters", () => {
    const log = `
Input #0, matroska,webm, from 'sample.mkv':
  Duration: 00:05:00.00, start: 0.000000
  Stream #0:0: Video: h264
    `;
    expect(parseChaptersFromFFmpegLog(log, 300)).toEqual([]);
  });

  it("returns [] for an empty string", () => {
    expect(parseChaptersFromFFmpegLog("", 0)).toEqual([]);
  });

  it("does not throw on malformed input", () => {
    expect(() => parseChaptersFromFFmpegLog("garbage !!!@#", 100)).not.toThrow();
  });
});

describe("parseChaptersFromVtt", () => {
  const vtt3Cues = `WEBVTT

Introduction
00:00:00.000 --> 00:02:22.500

Act 1
00:02:22.500 --> 00:05:00.000

Credits
00:05:00.000 --> 00:10:00.000
`;

  it("parses 3 chapters from a VTT file", () => {
    const chapters = parseChaptersFromVtt(vtt3Cues);
    expect(chapters).toHaveLength(3);

    expect(chapters[0]).toMatchObject({
      index: 0,
      title: "Introduction",
      startTime: 0,
      endTime: 142.5,
    });
    expect(chapters[1]).toMatchObject({
      index: 1,
      title: "Act 1",
      startTime: 142.5,
      endTime: 300,
    });
    expect(chapters[2]).toMatchObject({
      index: 2,
      title: "Credits",
      startTime: 300,
      endTime: 600,
    });
  });

  it("returns [] for an empty VTT string", () => {
    expect(parseChaptersFromVtt("")).toEqual([]);
  });

  it("returns [] for a string with only the WEBVTT header", () => {
    expect(parseChaptersFromVtt("WEBVTT\n")).toEqual([]);
  });

  it("does not throw on malformed input", () => {
    expect(() => parseChaptersFromVtt("not a vtt file !!!")).not.toThrow();
  });

  it("handles MM:SS timestamps", () => {
    const vtt = `WEBVTT

Intro
00:00 --> 02:30
`;
    const chapters = parseChaptersFromVtt(vtt);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].startTime).toBe(0);
    expect(chapters[0].endTime).toBe(150);
  });
});
