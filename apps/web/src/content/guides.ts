import { pages, type SearchPage } from "@/lib/site";

type GuideSection = {
  heading: string;
  paragraphs?: string[];
  steps?: string[];
  code?: string;
};
export type Guide = {
  page: SearchPage;
  heading: string;
  audience: string;
  intro: string;
  action: { href: string; label: string };
  sections: GuideSection[];
  questions: { question: string; answer: string }[];
};

export const guides: readonly Guide[] = [
  {
    page: pages.mkv,
    heading: "Play MKV files in your browser",
    audience: "For video-player users",
    intro: "LightBird is a free, open-source online MKV player. Open a local video, choose an available audio track, and use embedded or external subtitles without uploading the file to a video-hosting service.",
    action: { href: "/", label: "Open the video player" },
    sections: [
      {
        heading: "How to open an MKV file",
        steps: [
          "Open LightBird and choose Open video. On a computer, you can also drop a video into the player.",
          "Select an MKV file from your device. Keep the browser tab open while the player prepares the file.",
          "Start playback. Use the audio and subtitle menus to choose tracks detected in the file; on a small screen, open More controls first.",
          "Add more videos to the playlist, or load an external SRT, VTT, ASS, or SSA subtitle file from the subtitles menu.",
        ],
      },
      {
        heading: "Why MKV playback needs more than a file extension",
        paragraphs: [
          "MKV is a container: it can hold several combinations of video, audio, subtitle, and chapter tracks. A browser that plays one MKV file may not be able to decode another.",
          "LightBird uses FFmpeg.wasm in a browser worker to prepare MKV media for playback. Remuxing can change the container without changing the video codec, so it does not guarantee that an unsupported codec will become playable. Large files and complex tracks can take longer or exceed a device's available memory.",
          "If a video fails, check the playback error and try a file encoded for your browser. For embedding or self-hosting, the documentation explains the cross-origin isolation headers needed by the MKV processing path.",
        ],
      },
      {
        heading: "Subtitles, audio tracks, and chapters",
        paragraphs: [
          "When those tracks are present and supported, LightBird exposes audio selection, subtitle selection, and chapter navigation. You can also add an external subtitle and adjust playback speed. Available options depend on the file and browser, rather than the .mkv extension alone.",
        ],
      },
    ],
    questions: [
      { question: "Does LightBird upload my local MKV file?", answer: "Local files are read and processed in your browser. The app can fetch its own assets, and optional online subtitle search or remote streams make separate network requests; those features are different from opening a local file." },
      { question: "Can I use the MKV player on a phone?", answer: "The player has a responsive interface, touch controls, and a mobile playlist. Whether a particular MKV plays also depends on the mobile browser's codec support, memory, and processing resources." },
      { question: "Do I need to create an account?", answer: "No account is needed to open local videos in the public LightBird player." },
    ],
  },
  {
    page: pages.hls,
    heading: "Play HLS streams from an M3U8 URL",
    audience: "For stream viewers and developers",
    intro: "Use LightBird as a free online HLS player for streams you are allowed to access. Paste an M3U8 URL into the player, or embed the same playback engine in a JavaScript application.",
    action: { href: "/", label: "Open the HLS player" },
    sections: [
      {
        heading: "How to play an M3U8 stream",
        steps: [
          "Copy a direct, accessible M3U8 playlist URL from your own stream or a provider that permits browser playback.",
          "Open LightBird, choose Open URL, paste the address, and add it to the playlist.",
          "Start playback. If the stream exposes multiple renditions, inspect the quality options available for that source.",
        ],
      },
      {
        heading: "What HLS and M3U8 mean",
        paragraphs: [
          "HTTP Live Streaming (HLS) delivers video as a playlist and a sequence of media segments. An .m3u8 URL points to that playlist; it is not usually a single downloadable video file. A master playlist may describe several resolutions or bitrates so a player can adapt to the connection.",
          "LightBird's core includes an HLS playback path backed by hls.js, with native HLS used where the browser supports it. Stream quality, audio options, live behavior, and seeking depend on the playlist and the browser.",
        ],
      },
      {
        heading: "Troubleshooting a stream that will not load",
        paragraphs: [
          "The playlist and its media segments must be reachable from the browser. For cross-origin requests, the stream host must allow the required CORS access. On an HTTPS site, use HTTPS stream URLs rather than mixed-content HTTP addresses.",
          "Expired signed URLs, missing authentication, blocked segments, and unsupported codecs can prevent playback. LightBird does not bypass authentication or DRM. A webpage URL containing a video is also different from a direct M3U8 playlist URL.",
        ],
      },
      {
        heading: "Embed an HLS stream with a Web Component",
        paragraphs: ["Install @lightbird/player and import it in your application's browser entry point. Replace the example URL with a stream you control, then use the playground to explore available controls."],
        code: `import '@lightbird/player';\n\n// In your HTML template:\n<lightbird-player\n  src="https://your-stream.example/live.m3u8"\n  controls\n></lightbird-player>`,
      },
    ],
    questions: [
      { question: "Is an M3U8 URL the same as an imported M3U playlist?", answer: "An HLS M3U8 URL describes a stream and its segments. An imported M3U playlist can instead list several video or stream sources. Use Open URL for a direct HLS stream and the playlist import action for a collection of sources." },
      { question: "Can LightBird play every protected stream?", answer: "No. Streams must permit access from your browser. A URL alone does not provide a provider's login session, required request headers, or DRM license." },
    ],
  },
  {
    page: pages.react,
    heading: "Add an open-source video player to React",
    audience: "For React and Next.js developers",
    intro: "@lightbird/player-react provides LightBird's ready-made player UI for React. Add a responsive playlist, subtitle controls, keyboard shortcuts, and playback settings, or use the core hooks to build your own interface.",
    action: { href: "/playground", label: "Try the React playground" },
    sections: [
      {
        heading: "Install the React player",
        code: "npm install @lightbird/core @lightbird/player-react react react-dom",
        paragraphs: ["The React player supports React 18 and 19. The @lightbird/core package provides the underlying engine and hooks; the React package provides the controls and playlist interface."],
      },
      {
        heading: "Render a player with a bounded height",
        code: `"use client";\n\nimport { LightBirdPlayer } from '@lightbird/player-react';\nimport '@lightbird/player-react/styles.css';\n\nexport default function VideoPage() {\n  return (\n    <div style={{ height: '80dvh', minHeight: 320 }}>\n      <LightBirdPlayer />\n    </div>\n  );\n}`,
        paragraphs: [
          "The component includes file opening and playlist management, so users can select local videos without your app uploading them to a server. Give the player a container with an explicit height; its compact controls and playlist presentation adapt to the available width.",
          "In Next.js, place browser integrations behind a client component and import global styles from an appropriate app entry point. If you generate your own Tailwind utilities instead, follow the documentation's content scanning setup and import the standalone responsive stylesheet.",
        ],
      },
      {
        heading: "Use hooks when you need a custom interface",
        paragraphs: [
          "@lightbird/core/react exports hooks for playback, subtitles, playlists, fullscreen, and other player behavior. Use these when your application needs its own controls rather than the complete LightBird interface. The documentation describes the core API and hook signatures.",
          "MKV processing requires the documented browser assets and cross-origin isolation headers. Remote video sources also need appropriate access and CORS configuration. Check these requirements before choosing an embedding or hosting setup.",
        ],
      },
    ],
    questions: [
      { question: "Can I use LightBird in Next.js?", answer: "Yes. Use a client component for the React player, include its stylesheet, and configure the documented headers and assets for features such as MKV processing. The LightBird website itself is a Next.js application." },
      { question: "Can I customize the controls?", answer: "Use the exported UI components and core React hooks for custom interfaces. The framework-independent Web Component also offers a control allow-list when a custom element is a better fit for your app." },
      { question: "What license does LightBird use?", answer: "The project and player packages use the MIT license. Review the repository license and the licenses of dependencies when distributing an application." },
    ],
  },
  {
    page: pages.component,
    heading: "A video player Web Component for your framework",
    audience: "For JavaScript, Vue, Svelte, and Angular developers",
    intro: "@lightbird/player registers the <lightbird-player> custom element. Use a standard HTML element in Vue, Svelte, Angular, Solid, or plain HTML, without adding a React wrapper.",
    action: { href: "/playground", label: "Build a Web Component example" },
    sections: [
      {
        heading: "Install and register the custom element",
        paragraphs: ["Install the package, then import it once in your browser entry point. A bundler resolves the npm import; a bare package name in an ordinary browser script requires a compatible import map or build setup."],
        code: `npm install @lightbird/player\n\n// Browser entry point, processed by your bundler:\nimport '@lightbird/player';`,
      },
      {
        heading: "Add a video to an HTML or framework template",
        code: `<lightbird-player\n  src="/videos/example.mp4"\n  poster="/images/poster.jpg"\n  controls\n></lightbird-player>`,
        paragraphs: [
          "The src attribute identifies the video, and controls enables LightBird's styled control bar. MP4 and WebM use browser playback; HLS and MKV sources load the relevant core engine when needed. Browser codecs, remote-source access, and MKV hosting requirements still apply.",
          "In frameworks that validate custom tags, declare lightbird-player as a custom element using that framework's supported configuration. The package README includes plain HTML, Vue, and Svelte examples to help you wire attributes and events correctly.",
        ],
      },
      {
        heading: "Choose controls and listen to media events",
        code: `<lightbird-player\n  src="/videos/example.mp4"\n  controls="play seek volume time fullscreen"\n></lightbird-player>\n\n<script type="module">\n  const player = document.querySelector('lightbird-player');\n  player.addEventListener('timeupdate', (event) => {\n    console.log(event.detail.currentTime);\n  });\n</script>`,
        paragraphs: [
          "A controls allow-list lets you choose which features appear. The element redispatches media events as CustomEvents with playback state in event.detail. It also exposes methods such as play() and pause() for integration with the rest of your app.",
          "Shadow DOM keeps the built-in styles scoped to the component. Use the documented CSS parts and --lb-accent custom property to adjust its appearance. Subtitle sources and playlist sources are available through the documented attributes and properties.",
        ],
      },
    ],
    questions: [
      { question: "Does the Web Component require React?", answer: "No. @lightbird/player is a framework-independent custom element. Choose @lightbird/player-react when you want the React component interface instead." },
      { question: "Can I use native browser controls?", answer: "Yes. The Web Component's nativecontrols option can use the browser's built-in video controls. Styled controls and individual feature selection are also available." },
      { question: "Where can I see a working integration?", answer: "Use the LightBird playground to generate a snippet, or browse the package's plain HTML, Vue, and Svelte examples in the GitHub repository." },
    ],
  },
];
