import React from "react";
import type { VideoMetadata } from "@lightbird/core";
import { X } from "lucide-react";

interface VideoInfoPanelProps {
  metadata: VideoMetadata | null;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function formatBitrate(bps: number | null): string {
  if (!bps) return "—";
  return bps > 1e6
    ? `${(bps / 1e6).toFixed(1)} Mbps`
    : `${(bps / 1e3).toFixed(0)} Kbps`;
}

export function VideoInfoPanel({ metadata, onClose }: VideoInfoPanelProps) {
  if (!metadata) return null;

  const rows: [string, string][] = [
    ["File", metadata.filename ? metadata.filename.split("/").pop() ?? metadata.filename : "—"],
    ["Size", formatSize(metadata.fileSize)],
    ["Duration", formatTime(metadata.duration)],
    ["Container", metadata.container || "—"],
    ["Resolution", metadata.width && metadata.height ? `${metadata.width} × ${metadata.height}` : "—"],
    ["Frame Rate", metadata.frameRate ? `${metadata.frameRate} fps` : "—"],
    ["Video Codec", metadata.videoCodec ?? "—"],
    ["Video Bitrate", formatBitrate(metadata.videoBitrate)],
    ...metadata.audioTracks.map(
      (t, i) =>
        [
          `Audio ${i + 1}`,
          [
            t.codec ?? "?",
            t.channels ? `${t.channels}ch` : null,
            t.sampleRate ? `${(t.sampleRate / 1000).toFixed(1)} kHz` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        ] as [string, string]
    ),
  ];

  return (
    <div className="absolute top-4 right-4 z-40 bg-black/85 text-white rounded-lg p-4 text-xs w-72">
      <div className="flex justify-between mb-3">
        <h3 className="font-semibold text-sm">Video Information</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-white"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <table className="w-full">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-white/10 last:border-0">
              <td className="py-1 pr-3 text-muted-foreground whitespace-nowrap">{label}</td>
              <td className="py-1 text-right font-mono break-all">{value || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
