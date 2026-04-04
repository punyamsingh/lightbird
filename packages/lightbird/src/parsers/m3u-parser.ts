import type { PlaylistItem } from "../types";

/** Export a playlist as an M3U8 file and trigger a browser download. */
export function exportPlaylist(items: PlaylistItem[]): void {
  const lines = ["#EXTM3U"];
  for (const item of items) {
    lines.push(`#EXTINF:-1,${item.name}`);
    lines.push(item.type === "stream" ? item.url : item.name);
  }
  const blob = new Blob([lines.join("\n")], {
    type: "application/vnd.apple.mpegurl",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lightbird-playlist.m3u8";
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse an M3U / M3U8 text file into playlist item descriptors (without id). */
export function parseM3U8(text: string): Omit<PlaylistItem, "id">[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const items: Omit<PlaylistItem, "id">[] = [];
  let nextName: string | null = null;

  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      nextName = line.split(",").slice(1).join(",").trim() || null;
    } else if (!line.startsWith("#")) {
      const isStream = line.startsWith("http");
      items.push({
        name: nextName ?? line,
        url: isStream ? line : "",
        type: isStream ? "stream" : "video",
      });
      nextName = null;
    }
  }
  return items;
}
