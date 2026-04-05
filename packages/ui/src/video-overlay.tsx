import React from "react";

interface VideoOverlayProps {
  isLoading: boolean;
  loadingMessage: string;
  processingProgress?: number;
  eta?: number | null;        // seconds remaining (null = not yet calculable)
  throughputMBs?: number | null; // MB/s (null = not yet calculable)
  onCancel?: () => void;
}

export function VideoOverlay({ isLoading, loadingMessage, processingProgress = 0, eta, throughputMBs, onCancel }: VideoOverlayProps) {
  if (!isLoading && !loadingMessage) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white z-10">
      <div className="w-16 h-16 border-4 border-t-transparent border-primary rounded-full animate-spin" />
      <p className="mt-4 text-lg max-w-sm text-center">
        {loadingMessage || "Processing video..."}
      </p>
      {processingProgress > 0 && processingProgress < 1 && (
        <>
          <div className="mt-4 w-64 bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(processingProgress * 100)}%` }}
            />
          </div>
          {throughputMBs !== null && throughputMBs !== undefined && (
            <p className="mt-1 text-sm text-white/60">
              {throughputMBs} MB/s
              {eta !== null && eta !== undefined && ` · ~${eta}s left`}
            </p>
          )}
        </>
      )}
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-3 px-4 py-1.5 text-sm rounded border border-white/30 text-white/80 hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
