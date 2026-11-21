import type { Metadata } from "next";

// Use the public production origin even when a page is built on a preview URL.
export const SITE_URL = "https://lightbird.vercel.app";
export const REPOSITORY_URL = "https://github.com/punyamsingh/lightbird";
export const SOCIAL_IMAGE = `${SITE_URL}/opengraph-image`;

export const pages = {
  home: {
    path: "/",
    title: "LightBird — Free Online Video Player",
    description: "Play local videos in your browser with LightBird, a free, open-source video player with MKV support, subtitles, playlists, React components, and Web Components.",
  },
  docs: {
    path: "/docs",
    title: "Video Player Documentation for JavaScript and React | LightBird",
    description: "Install LightBird and explore its JavaScript video engine, React player, hooks, and Web Component. Find setup examples, subtitle APIs, and browser requirements.",
  },
  playground: {
    path: "/playground",
    title: "React and Web Component Video Player Playground | LightBird",
    description: "Try LightBird's video player, change playback options, and copy a React or Web Component integration snippet. Test local videos directly in your browser.",
  },
  mkv: {
    path: "/mkv-player",
    title: "Online MKV Player with Subtitles | LightBird",
    description: "Open local MKV files in your browser with LightBird. Use embedded audio tracks, subtitles, and chapters, and learn which browser and codec requirements apply.",
  },
  hls: {
    path: "/hls-player",
    title: "Online HLS Player for M3U8 Streams | LightBird",
    description: "Play an accessible M3U8 stream in LightBird's browser video player. Learn about HLS playback, quality selection, CORS, and embedding streams in your app.",
  },
  react: {
    path: "/react-video-player",
    title: "Open-Source React Video Player | LightBird",
    description: "Add a responsive video player to a React app with LightBird. Get a ready-made playlist UI, subtitles, keyboard shortcuts, and hooks for custom controls.",
  },
  component: {
    path: "/web-component-video-player",
    title: "Web Component Video Player for Vue, Svelte and HTML | LightBird",
    description: "Embed the lightbird-player custom element in Vue, Svelte, Angular, or plain HTML. Start with a video URL, then add subtitles, playlists, and custom controls.",
  },
} as const;

export type SearchPage = { path: string; title: string; description: string };
export const publicPages: readonly SearchPage[] = Object.values(pages);

export function isPreviewDeployment(environment = process.env.VERCEL_ENV): boolean {
  return environment === "preview" || environment === "development";
}

/** Keep each page's canonical URL and social metadata consistent. */
export function pageMetadata(page: SearchPage): Metadata {
  const url = new URL(page.path, SITE_URL).toString();
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website", siteName: "LightBird", locale: "en_US",
      url, title: page.title, description: page.description,
      images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: "LightBird — browser video player, React components and Web Components" }],
    },
    twitter: {
      card: "summary_large_image", title: page.title, description: page.description,
      images: [SOCIAL_IMAGE],
    },
  };
}

export const projectStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "LightBird", url: SITE_URL,
      description: "A free, open-source browser video player and JavaScript video player libraries.",
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication", "@id": `${SITE_URL}/#player`, name: "LightBird",
      url: SITE_URL, applicationCategory: "MultimediaApplication", operatingSystem: "Web browser",
      description: pages.home.description, isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      license: `${REPOSITORY_URL}/blob/master/LICENSE`,
      sameAs: [REPOSITORY_URL, "https://www.npmjs.com/package/@lightbird/core", "https://www.npmjs.com/package/@lightbird/player-react", "https://www.npmjs.com/package/@lightbird/player"],
    },
    {
      "@type": "SoftwareSourceCode", "@id": `${SITE_URL}/#source`, name: "LightBird",
      codeRepository: REPOSITORY_URL, url: REPOSITORY_URL,
      programmingLanguage: ["TypeScript", "JavaScript"],
      license: `${REPOSITORY_URL}/blob/master/LICENSE`,
      targetProduct: { "@id": `${SITE_URL}/#player` },
    },
  ],
};

/** Escape HTML delimiters before placing JSON in an inline script element. */
export function serializeStructuredData(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
