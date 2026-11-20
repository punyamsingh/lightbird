import { guides } from '../src/content/guides';
import { isPreviewDeployment, pageMetadata, pages, publicPages, serializeStructuredData, SITE_URL } from '../src/lib/site';
import robots from '../src/app/robots';
import sitemap from '../src/app/sitemap';

describe('search discovery configuration', () => {
  it('publishes a canonical sitemap with no duplicate or invented modification dates', () => {
    const entries = sitemap();
    expect(entries.map(entry => entry.url)).toEqual([
      `${SITE_URL}/`, `${SITE_URL}/docs`, `${SITE_URL}/playground`,
      `${SITE_URL}/mkv-player`, `${SITE_URL}/hls-player`,
      `${SITE_URL}/react-video-player`, `${SITE_URL}/web-component-video-player`,
    ]);
    expect(entries.every(entry => !entry.lastModified)).toBe(true);
  });
  it('gives the docs their own canonical and social URL rather than inheriting the home page', () => {
    const metadata = pageMetadata(pages.docs);
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/docs`);
    expect(metadata.openGraph).toMatchObject({ url: `${SITE_URL}/docs`, title: pages.docs.title });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', title: pages.docs.title });
  });
  it('keeps every focused guide discoverable with distinct page metadata', () => {
    const guidePaths = guides.map(guide => guide.page.path);
    expect(new Set(guidePaths).size).toBe(4);
    expect(publicPages.filter(page => !['/', '/docs', '/playground'].includes(page.path)).map(page => page.path)).toEqual(guidePaths);
    expect(new Set(publicPages.map(page => page.title)).size).toBe(publicPages.length);
    expect(new Set(publicPages.map(page => page.description)).size).toBe(publicPages.length);
  });
  it.each(['preview', 'development'])('blocks the %s deployment from crawling', environment => {
    const previous = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = environment;
    try {
      expect(isPreviewDeployment()).toBe(true);
      expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
    } finally {
      if (previous === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previous;
    }
  });
  it('allows production crawling and advertises the production sitemap', () => {
    expect(isPreviewDeployment('production')).toBe(false);
    expect(isPreviewDeployment('')).toBe(false);
    const previous = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = 'production';
    try { expect(robots()).toMatchObject({ rules: { allow: '/', disallow: '/api/' }, sitemap: `${SITE_URL}/sitemap.xml` }); }
    finally {
      if (previous === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previous;
    }
  });
  it('prevents structured data from terminating its containing script', () => {
    const data = { text: '</script><script>alert(1)</script>' };
    const serialized = serializeStructuredData(data);
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
