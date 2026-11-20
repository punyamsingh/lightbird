# LightBird discoverability

The website serves the online player and developer integrations. Its canonical
production origin is `https://lightbird.vercel.app`, matching the package and
repository links. Change `apps/web/src/lib/site.ts` and public documentation links
if the official domain changes. Redirect the old domain when moving sites.

## What the site publishes

- Distinct titles, descriptions, canonical URLs, Open Graph and Twitter metadata.
- A generated PNG share image at `/opengraph-image`.
- `/robots.txt` and `/sitemap.xml` covering the player, docs, playground, and four guides.
- Server-rendered descriptions, usage steps, examples, and questions, linked from
  the home page and documentation. The player remains the first viewport.
- Structured data describing the website, free application, source repository,
  and guide breadcrumbs. No review ratings or search-result guarantees are invented.
- `noindex, nofollow` metadata and a disallow-all robots file for Vercel preview
  and development deployments. Production pages remain indexable.

## After deployment

1. Open the production pages, `/robots.txt`, `/sitemap.xml`, and the share image.
   Check redirects and ensure the canonical origin is the final public domain.
2. Finish Google Search Console ownership verification. The existing verification
   file `googlec1d412ad5b561781.html` remains in `apps/web/public`; it must be
   reachable at the production site root. The file's presence alone does not
   prove ownership has been verified in Search Console.
3. Submit `https://lightbird.vercel.app/sitemap.xml` in Search Console. Inspect
   the home page and the four guide URLs; request indexing where appropriate.
4. Check Google's rendered page and structured-data inspection. Valid metadata
   and schema do not guarantee indexing, rankings, or a particular rich result.
5. Record a baseline of indexed pages, impressions, clicks, and queries. Revisit
   after search engines have recrawled the site, then improve pages using real
   query data rather than adding repetitive keyword pages.

No Search Console, production analytics, ranking, or backlink data was available
in the development environment. Those measurements and submissions need access
to the relevant account.

## GitHub and npm

The README links directly to the live player, guide pages, docs, and all three
packages. In the GitHub repository's About settings, use the production website
URL and a specific description such as:

> Open-source browser video player with MKV, HLS, subtitles, React components,
> and a framework-independent Web Component.

Suggested repository topics: `video-player`, `react`, `web-components`, `mkv`,
`hls`, `subtitles`, `typescript`, `ffmpeg-wasm`. These settings require repository
access; README changes do not update them automatically.

Keep npm package descriptions, keywords, READMEs, and homepage links aligned with
actual supported features. Package publication uses the existing release
workflow; a website change does not publish a package release.

## Ongoing discovery work

Use developer guides and runnable examples when sharing LightBird in relevant
communities. Write about observed problems such as MKV codec limits or browser
CORS setup, and link to the corresponding guide. Submit to relevant open-source
and developer directories where appropriate. Avoid paid link schemes, fake
reviews, or mass-produced pages that repeat the same information.

## Validation

```bash
pnpm --filter web run test --maxWorkers=2
pnpm --filter web build
pnpm --filter web exec next start -p 9002
# In another terminal:
pnpm test:seo
```

The SEO check reads pages with JavaScript disabled, checks canonical and social
metadata, validates sitemap coverage and robots rules, parses structured data,
and verifies the generated PNG. It runs alongside responsive checks in CI.
