'use strict';

// Run against a development or production server. See README.md.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');
const baseURL = process.env.LIGHTBIRD_TEST_URL || 'http://127.0.0.1:9002';
const fixture = readFileSync(join(__dirname, '../apps/web/__tests__/fixtures/responsive.webm'));
const viewports = [[320, 568], [375, 667], [390, 844], [768, 1024], [1024, 768], [1440, 900], [844, 390]];

async function poll(check, message, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(message);
}
async function fits(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page overflow');
  const box = await page.locator('.lb-video-surface').boundingBox();
  assert(box.width > 0 && box.height > 0, 'video has no usable space');
}
async function bounded(locator, page) {
  const { width, height } = page.viewportSize();
  await poll(async () => {
    const box = await locator.boundingBox();
    return box && box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1;
  }, 'element outside viewport: ' + JSON.stringify(await locator.boundingBox()), 2000);
}
async function upload(page, count = 1) {
  const files = Array.from({ length: count }, (_, index) => ({
    name: `Video ${index + 1} with a long filename to exercise playlist truncation.webm`, mimeType: 'video/webm', buffer: fixture,
  }));
  const openVideo = page.getByRole('button', { name: 'Open video', exact: true });
  if (await openVideo.isVisible()) {
    const chooser = page.waitForEvent('filechooser');
    await openVideo.click();
    await (await chooser).setFiles(files);
  } else {
    await page.locator('input[aria-label="Open video files"]').setInputFiles(files);
  }
  await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
}

(async () => {
  await poll(async () => { try { return (await fetch(baseURL)).ok; } catch { return false; } }, 'Start the web server before running this check', 120000);
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    for (const [width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1024, isMobile: width < 640 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(15000);
      await page.goto(baseURL);
      await page.getByRole('button', { name: 'Open video', exact: true }).waitFor();
      await poll(async () => (await page.locator('.lb-player').getAttribute('data-compact')) === String(width < 1024), 'layout did not settle');
      await fits(page);
      await bounded(page.getByRole('button', { name: 'Open video', exact: true }), page);
      if (width < 1024) {
        await page.getByRole('button', { name: 'Open URL', exact: true }).click();
        await bounded(page.getByRole('dialog', { name: 'Playlist' }), page);
        assert(await page.getByRole('textbox', { name: 'Video URL' }).evaluate(el => el === document.activeElement), 'URL input not focused');
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await poll(() => page.locator('.lb-playlist-trigger').evaluate(el => el === document.activeElement), 'focus not restored');
      }
      await upload(page);
      await page.locator('video').evaluate(video => video.pause());
      if (width < 1024) {
        await page.locator('video').tap();
        assert(await page.locator('video').evaluate(el => el.paused), 'tap unexpectedly toggled playback');
      }
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('video').paused);
      const video = await page.locator('video').elementHandle();
      // Rotation changes layout without replacing the video or resetting position.
      await page.locator('video').evaluate(video => { video.currentTime = 2; video.pause(); });
      await page.setViewportSize({ width: height, height: width });
      await poll(async () => (await page.locator('.lb-player').getAttribute('data-compact')) === String(height < 1024), 'rotation did not settle');
      assert(await video.evaluate(el => el === document.querySelector('video')), 'video replaced during rotation');
      assert(await page.locator('video').evaluate(el => el.currentTime >= 1.8), 'playback position reset');
      await fits(page);
      await page.setViewportSize({ width, height });
      await poll(async () => (await page.locator('.lb-player').getAttribute('data-compact')) === String(width < 1024), 'layout did not restore');
      const more = page.getByRole('button', { name: 'More controls', exact: true });
      if (await more.isVisible()) {
        await more.click();
        await bounded(page.getByRole('button', { name: 'Playback speed', exact: true }), page);
        await page.getByRole('button', { name: 'Playback speed', exact: true }).click();
        await bounded(page.getByRole('radiogroup').locator('..'), page);
        await page.getByText('4x', { exact: true }).scrollIntoViewIfNeeded();
        await bounded(page.getByText('4x', { exact: true }), page);
        await page.getByText('1.5x', { exact: true }).click();
        assert.equal(await page.locator('video').evaluate(el => el.playbackRate), 1.5);
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
      }
      if (width < 1024) {
        // Pausing must not open a mobile playlist sheet.
        assert.equal(await page.getByRole('dialog', { name: 'Playlist' }).count(), 0);
        await upload(page, 25);
        await page.locator('.lb-playlist-trigger').click();
        const dialog = page.getByRole('dialog', { name: 'Playlist' });
        await bounded(dialog, page);
        const last = dialog.getByRole('button', { name: /^Play Video 25 / });
        await last.scrollIntoViewIfNeeded();
        await bounded(last, page);
        await last.click();
        await dialog.waitFor({ state: 'hidden' });
      }
      assert.deepEqual(errors, [], 'uncaught application errors');
      console.log(`PASS ${width}x${height}: layout, sources, playback, rotation, menus${width < 1024 ? ', long playlist, focus' : ''}`);
      await page.close();
    }
    // A narrow embed in a desktop browser must get the compact layout too.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(15000);
    await page.goto(baseURL);
    await page.getByRole('button', { name: 'Open video', exact: true }).waitFor();
    await page.locator('.lb-player').evaluate(el => { el.style.flex = 'none'; el.style.width = '390px'; });
    await poll(async () => await page.locator('.lb-player').getAttribute('data-compact') === 'true', 'embed did not adapt');
    await page.locator('.lb-playlist-trigger').click();
    await bounded(page.getByRole('dialog', { name: 'Playlist' }), page);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await upload(page);
    await page.locator('video').evaluate(video => video.pause());
    console.log('Checking fullscreen menus and subtitle upload');
    await page.locator('.lb-player').evaluate(el => { el.style.width = ''; el.style.flex = ''; });
    await poll(async () => (await page.locator('.lb-player').getAttribute('data-compact')) === 'false', 'desktop layout did not restore');
    await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
    await page.waitForFunction(() => document.fullscreenElement?.classList.contains('lb-player'));
    // Both inline and compact controls use the same fullscreen portal host.
    await poll(async () => (await page.locator('.lb-player').getAttribute('data-compact')) === 'false', 'fullscreen layout did not settle');
    await page.getByRole('button', { name: 'Subtitles', exact: true }).click();
    assert(await page.locator('.lb-popover').evaluate(el => document.fullscreenElement.contains(el)), 'fullscreen menu rendered outside player');
    await page.locator('input[accept=".vtt,.srt,.ass,.ssa"]').setInputFiles({
      name: 'captions.vtt', mimeType: 'text/vtt', buffer: Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:07.000\nResponsive captions\n'),
    });
    await page.getByText(/captions\.vtt/).waitFor();
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.exitFullscreen());
    console.log('PASS narrow desktop embed, fullscreen menus, subtitle upload');
    await page.close();
    const scaled = await browser.newPage({ viewport: { width: 390, height: 844 } });
    scaled.setDefaultTimeout(15000);
    await scaled.goto(baseURL);
    await scaled.getByRole('button', { name: 'Open video', exact: true }).waitFor();
    await scaled.addStyleTag({ content: 'html { font-size: 200%; }' });
    await fits(scaled);
    await bounded(scaled.getByRole('button', { name: 'Open video', exact: true }), scaled);
    await scaled.getByRole('button', { name: 'Open URL', exact: true }).click();
    await bounded(scaled.getByRole('dialog', { name: 'Playlist' }), scaled);
    await scaled.getByRole('textbox', { name: 'Video URL' }).fill(`${baseURL}/missing-video.webm`);
    await scaled.getByRole('button', { name: 'Add video URL', exact: true }).click();
    await scaled.getByText('Playback Error', { exact: true }).waitFor();
    await bounded(scaled.getByRole('button', { name: 'Dismiss', exact: true }), scaled);
    console.log('PASS 200% text scaling and playback error recovery');
    await scaled.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
