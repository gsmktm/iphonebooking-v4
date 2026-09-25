import { chromium, expect } from '@playwright/test';

const origin = process.env.PWA_TEST_ORIGIN ?? 'http://localhost:4101';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) {
  throw new Error('Run the production PWA check against a local compiled server.');
}
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext();
try {
  const page = await context.newPage();
  await page.goto(origin);
  await page.locator('.quick-config').waitFor();
  const manifest = await (await context.request.get(`${origin}/manifest.webmanifest`)).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.theme_color).toBe('#071014');
  for (const icon of manifest.icons) {
    expect((await context.request.get(new URL(icon.src, origin).href)).ok()).toBe(true);
  }
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const urls = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith('iphonebooking-public-'));
    const paths = await Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);
        return (await cache.keys()).map((request) => new URL(request.url).pathname);
      }),
    );
    return paths.flat().sort();
  });
  expect(urls).toEqual(['/appearance.js', '/icon.svg', '/offline.html']);
  await context.setOffline(true);
  await page.goto(`${origin}/account/devices`);
  await expect(page.getByRole('heading', { name: /A little pause/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try again' })).toBeVisible();
  console.log('PASS: manifest, icons, active service worker, public-only cache, offline recovery.');
} finally {
  await context.close();
  await browser.close();
}
