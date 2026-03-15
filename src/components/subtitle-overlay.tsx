"use client";

import { useState, useEffect, type RefObject } from "react";

interface SubtitleOverlayProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  activeSubtitle: string;
}

export function SubtitleOverlay({ videoRef, activeSubtitle }: SubtitleOverlayProps) {
  const [cueText, setCueText] = useState<string>("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || activeSubtitle === "-1") {
      setCueText("");
      return;
    }

    const trackElements = Array.from(video.querySelectorAll("track"));
    const targetIdx = trackElements.findIndex(
      (el) => el.getAttribute("data-id") === activeSubtitle
    );
    if (targetIdx === -1) {
      setCueText("");
      return;
    }

    const textTrack = video.textTracks[targetIdx];
    if (!textTrack) {
      setCueText("");
      return;
    }

    const handleCueChange = () => {
      const activeCues = textTrack.activeCues;
      if (!activeCues || activeCues.length === 0) {
        setCueText("");
        return;
      }
      const texts: string[] = [];
      for (let i = 0; i < activeCues.length; i++) {
        const cue = activeCues[i] as VTTCue;
        // Preserve line breaks, strip WebVTT markup tags
        const cleaned = cue.text
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "");
        texts.push(cleaned);
      }
      setCueText(texts.join("\n"));
    };

    textTrack.addEventListener("cuechange", handleCueChange);
    handleCueChange();

    return () => {
      textTrack.removeEventListener("cuechange", handleCueChange);
      setCueText("");
    };
  }, [videoRef, activeSubtitle]);

  if (!cueText) return null;

  return (
    <div className="absolute left-0 right-0 bottom-4 flex justify-center pointer-events-none z-10 px-8 translate-y-0 group-hover:-translate-y-24 transition-transform duration-300 ease-in-out">
      <div
        className="bg-black/75 text-white text-base font-medium px-4 py-1.5 rounded text-center whitespace-pre-line leading-snug"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.8)" }}
      >
        {cueText}
      </div>
    </div>
  );
}
