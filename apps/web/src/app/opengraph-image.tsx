import { ImageResponse } from "next/og";

export const alt = "LightBird — free browser video player, React components and Web Components";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function SocialImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", background: "#101820", color: "#f1f5f9", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" rx="18" fill="#008cff" /><path d="M29 20L53 36L29 52Z" fill="white" /></svg>
        <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "6px", color: "#39a6ff" }}>LIGHTBIRD</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 68, lineHeight: 1.1, fontWeight: 700 }}>Your videos. Your browser.</div>
        <div style={{ fontSize: 28, color: "#b8c6d4" }}>Online video player · React · Web Components</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#8da3b8", borderTop: "1px solid #2b3e50", paddingTop: 24 }}>
        <span>Free and open source</span><span>lightbird.vercel.app</span>
      </div>
    </div>,
    size,
  );
}
