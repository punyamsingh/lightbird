"use client";
import React from "react";
import { FastForward, Rewind, Volume2, Sun } from "lucide-react";
import type { TouchGestureFeedback } from "@lightbird/core/react";

interface GestureFeedbackProps {
  feedback: TouchGestureFeedback | null;
}

/**
 * Transient on-screen indicator for touch gestures (seek / volume / brightness).
 * Renders nothing when there is no active feedback.
 */
export function GestureFeedback({ feedback }: GestureFeedbackProps) {
  if (!feedback) return null;

  if (feedback.type === "seek") {
    const Icon = feedback.direction === "forward" ? FastForward : Rewind;
    return (
      <div
        data-testid="gesture-feedback"
        className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
      >
        <div className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-white">
          <Icon className="h-5 w-5" />
          <span className="font-mono text-sm">{feedback.seconds}s</span>
        </div>
      </div>
    );
  }

  const Icon = feedback.type === "volume" ? Volume2 : Sun;
  const label = feedback.type === "volume" ? "Volume" : "Brightness";
  const percent = Math.round(feedback.value * 100);

  return (
    <div
      data-testid="gesture-feedback"
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-2 rounded-lg bg-black/70 px-5 py-3 text-white">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span className="text-sm">{label}</span>
        </div>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/25">
          <div
            data-testid="gesture-feedback-bar"
            className="h-full bg-primary"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="font-mono text-xs">{percent}%</span>
      </div>
    </div>
  );
}

export default GestureFeedback;
