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

    let cueChangeCleanup: (() => void) | null = null;

    function subscribeToTrack(): boolean {
      const trackElements = Array.from(video!.querySelectorAll("track"));
      const targetIdx = trackElements.findIndex(
        (el) => el.getAttribute("data-id") === activeSubtitle
      );
      if (targetIdx === -1) return false;

      const textTrack = trackElements[targetIdx].track;
      if (!textTrack) return false;

      const handleCueChange = () => {
        const activeCues = textTrack.activeCues;
        if (!activeCues || activeCues.length === 0) {
          setCueText("");
          return;
        }
        const texts: string[] = [];
        for (let i = 0; i < activeCues.length; i++) {
          const cue = activeCues[i] as VTTCue;
          const cleaned = cue.text
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "");
          texts.push(cleaned);
        }
        setCueText(texts.join("\n"));
      };

      // Scan all loaded cues to find what's active at the current playback
      // position. cuechange only fires on transitions, so without this seed
      // step the player shows nothing until the next sentence boundary.
      function seedFromCurrentTime() {
        const allCues = textTrack.cues;
        if (!allCues) return;
        const currentTime = video!.currentTime;
        const texts: string[] = [];
        for (let i = 0; i < allCues.length; i++) {
          const cue = allCues[i] as VTTCue;
          if (cue.startTime <= currentTime && cue.endTime > currentTime) {
            texts.push(
              cue.text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
            );
          }
        }
        setCueText(texts.join("\n"));
      }

      textTrack.addEventListener("cuechange", handleCueChange);

      const trackEl = trackElements[targetIdx];
      if (trackEl.readyState === 2) {
        // Cues already loaded — seed immediately.
        seedFromCurrentTime();
      } else {
        // Wait for the VTT to finish parsing, then seed.
        const onLoad = () => {
          seedFromCurrentTime();
          trackEl.removeEventListener("load", onLoad);
        };
        trackEl.addEventListener("load", onLoad);
      }

      cueChangeCleanup = () => {
        textTrack.removeEventListener("cuechange", handleCueChange);
        setCueText("");
      };
      return true;
    }

    if (subscribeToTrack()) {
      return () => cueChangeCleanup?.();
    }

    // Track not in DOM yet (async MKV extraction) — wait for it
    const observer = new MutationObserver(() => {
      if (subscribeToTrack()) {
        observer.disconnect();
      }
    });
    observer.observe(video, { childList: true });

    return () => {
      observer.disconnect();
      cueChangeCleanup?.();
    };
  }, [videoRef, activeSubtitle]);

  if (!cueText) return null;

  return (
    <div className="absolute left-0 right-0 bottom-4 flex justify-center pointer-events-none z-10 px-8 translate-y-0 group-hover:-translate-y-24 transition-transform duration-300 ease-in-out">
      <div
        className="text-white text-center whitespace-pre-line"
        style={{
          fontSize: "2em",
          lineHeight: "normal",
          fontWeight: "bolder",
          fontFamily: "Netflix Sans, Helvetica Neue, Helvetica, Arial, sans-serif",
          textShadow: "#000000 0px 0px 7px",
        }}
      >
        {cueText}
      </div>
    </div>
  );
}
