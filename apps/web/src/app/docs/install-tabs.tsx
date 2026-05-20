"use client";

import { useState } from "react";
import { CodeBlock } from "./code-block";

const INSTALL_TABS = ["React UI", "Headless React", "Vanilla JS"] as const;

const REACT_UI_CODE = `"use client"
import { LightBirdPlayer } from '@lightbird/ui'

export default function VideoPage() {
  return <LightBirdPlayer />
}`;

const HEADLESS_CODE = `"use client"
import { useRef } from 'react'
import { useVideoPlayback } from 'lightbird/react'
import { createVideoPlayer } from 'lightbird'

export default function MyPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isPlaying, togglePlay } = useVideoPlayback(videoRef)

  const handleFile = async (file: File) => {
    const player = createVideoPlayer(file)
    await player.initialize(videoRef.current!)
  }

  return (
    <div>
      <video ref={videoRef} />
      <button onClick={togglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}`;

const VANILLA_CODE = `import { createVideoPlayer } from 'lightbird'

const input = document.querySelector('input[type="file"]')
const video = document.querySelector('video')

input.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  const player = createVideoPlayer(file)
  await player.initialize(video)

  console.log('Subtitles:', player.getSubtitles())
  console.log('Audio tracks:', player.getAudioTracks())
})`;

const INSTALL_COMMANDS: Record<string, string> = {
  "React UI": "npm install lightbird @lightbird/ui",
  "Headless React": "npm install lightbird",
  "Vanilla JS": "npm install lightbird",
};

const INSTALL_CODE: Record<string, string> = {
  "React UI": REACT_UI_CODE,
  "Headless React": HEADLESS_CODE,
  "Vanilla JS": VANILLA_CODE,
};

function tabId(t: string) {
  return `install-tab-${t.replace(/\s+/g, "-").toLowerCase()}`;
}
function panelId(t: string) {
  return `install-panel-${t.replace(/\s+/g, "-").toLowerCase()}`;
}

export function InstallTabs() {
  const [tab, setTab] = useState<string>(INSTALL_TABS[0]);

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-white/[0.06] mb-6">
        {INSTALL_TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={tabId(t)}
            aria-selected={tab === t}
            aria-controls={panelId(t)}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => {
              const idx = INSTALL_TABS.indexOf(t as typeof INSTALL_TABS[number]);
              if (e.key === "ArrowRight") {
                const next = INSTALL_TABS[(idx + 1) % INSTALL_TABS.length];
                setTab(next);
                document.getElementById(tabId(next))?.focus();
              } else if (e.key === "ArrowLeft") {
                const prev = INSTALL_TABS[(idx - 1 + INSTALL_TABS.length) % INSTALL_TABS.length];
                setTab(prev);
                document.getElementById(tabId(prev))?.focus();
              }
            }}
            className={`docs-tab px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? "docs-tab-active text-[hsl(207,100%,60%)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={panelId(tab)}
        aria-labelledby={tabId(tab)}
        className="space-y-4"
      >
        <CodeBlock>{INSTALL_COMMANDS[tab]}</CodeBlock>
        <CodeBlock>{INSTALL_CODE[tab]}</CodeBlock>
        {tab === "React UI" && (
          <p className="text-sm text-muted-foreground mt-3">
            Add{" "}
            <code className="text-foreground text-xs bg-white/5 px-1.5 py-0.5 rounded">
              ./node_modules/@lightbird/ui/dist/**/*.js
            </code>{" "}
            to your Tailwind content config, or import{" "}
            <code className="text-foreground text-xs bg-white/5 px-1.5 py-0.5 rounded">
              @lightbird/ui/styles.css
            </code>{" "}
            for zero-config styling.
          </p>
        )}
      </div>
    </div>
  );
}
