'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const baseURL = process.env.LIGHTBIRD_TEST_URL || 'http://127.0.0.1:9002';
const canonicalOrigin = 'https://lightbird.vercel.app';
const paths = ['/', '/docs', '/playground', '/mkv-player', '/hls-player', '/react-video-player', '/web-component-video-player'];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'] });
  try {
    // Search content and links must be present in the server response, before hydration.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const titles = new Set();
    const descriptions = new Set();
    for (const path of paths) {
      const response = await page.goto(new URL(path, baseURL).toString());
      assert.equal(response.status(), 200, `${path} response`);
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      assert(title.includes('LightBird') && !titles.has(title), `${path} needs a distinct title`);
      assert(description && description.length > 60 && !descriptions.has(description), `${path} needs a distinct description`);
      titles.add(title); descriptions.add(description);
      const canonical = new URL(path, canonicalOrigin).toString();
      assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).toString(), canonical, `${path} canonical`);
      for (const [property, expected] of [['og:title', title], ['og:description', description], ['og:url', canonical]]) {
        const value = await page.locator(`meta[property="${property}"]`).getAttribute('content');
        assert.equal(property === 'og:url' ? new URL(value).toString() : value, expected, `${path} ${property}`);
      }
      assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image');
      const image = await page.locator('meta[property="og:image"]').first().getAttribute('content');
      assert(image.startsWith(`${canonicalOrigin}/opengraph-image`), `${path} social image`);
      assert.equal(await page.locator('h1').count(), 1, `${path} should have one descriptive h1`);
      assert((await page.locator('main').innerText()).length > 150, `${path} needs server-rendered content`);
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      assert(!robots.includes('noindex'), `${path} production page must be indexable`);
      for (const link of ['/docs', '/mkv-player', '/hls-player', '/react-video-player', '/web-component-video-player']) {
        assert(await page.locator(`a[href="${link}"]`).count(), `${path} missing discovery link ${link}`);
      }
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      const parsed = schemas.map(text => JSON.parse(text));
      const graph = parsed.flatMap(data => data['@graph'] || [data]);
      assert(graph.some(node => node['@type'] === 'WebSite'), `${path} website schema`);
      assert(graph.some(node => node['@type'] === 'SoftwareApplication'), `${path} application schema`);
      if (paths.indexOf(path) >= 3) assert(graph.some(node => node['@type'] === 'BreadcrumbList'), `${path} breadcrumbs`);
      console.log(`PASS SEO ${path}: server content, links, metadata, canonical, structured data`);
    }
    const sitemap = await (await fetch(new URL('/sitemap.xml', baseURL))).text();
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    assert.deepEqual([...urls].sort(), paths.map(path => new URL(path, canonicalOrigin).toString()).sort(), 'sitemap coverage');
    const robotsResponse = await fetch(new URL('/robots.txt', baseURL));
    assert.equal(robotsResponse.status, 200);
    const robotsText = await robotsResponse.text();
    assert(robotsText.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
    assert(robotsText.includes('Disallow: /api/'));
    assert(!/^Disallow: \/\s*$/m.test(robotsText), 'production robots must not block the whole site');
    const imageResponse = await fetch(new URL('/opengraph-image', baseURL));
    assert.equal(imageResponse.status, 200);
    assert(imageResponse.headers.get('content-type').startsWith('image/png'));
    const png = Buffer.from(await imageResponse.arrayBuffer());
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
    const verificationFile = 'googlec1d412ad5b561781.html';
    const verification = await fetch(new URL(`/${verificationFile}`, baseURL));
    assert.equal(verification.status, 200);
    assert.equal(await verification.text(), readFileSync(join(__dirname, '../apps/web/public', verificationFile), 'utf8'));
    assert.equal((await fetch(new URL('/not-a-lightbird-page', baseURL))).status, 404);
    console.log('PASS sitemap, robots, social PNG, Search Console verification file, and unknown-route 404');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
