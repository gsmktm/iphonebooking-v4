import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = process.env.RELEASE_TEST_ORIGIN || 'http://localhost:4101';
assert(
  ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
  'Check the compiled application on localhost.',
);
for (const file of [
  'apps/web/dist/index.html',
  'apps/web/dist/images/himalayas-v2.jpg',
  'apps/api/dist-server/index.js',
  'apps/api/dist-server/worker.js',
]) {
  await access(path.join(root, file));
}
const live = await fetch(`${base}/health`);
assert.equal(live.status, 200);
const ready = await fetch(`${base}/ready`);
assert.equal(ready.status, 200);
const home = await fetch(`${base}/api/v1/home`);
assert.equal(home.status, 200);
assert.equal(home.headers.get('cache-control'), 'no-store');
assert(home.headers.get('x-request-id'));
const data = await home.json();
assert(Array.isArray(data.products) && data.products.length <= 12);
const document = await fetch(base);
const html = await document.text();
assert.equal(document.status, 200);
assert(document.headers.get('content-security-policy')?.includes("default-src 'self'"));
assert(/<link rel="canonical" href="https:\/\//.test(html));
assert(html.includes('application/ld+json'));
const privatePage = await fetch(`${base}/account/devices`);
assert((await privatePage.text()).includes('noindex,nofollow'));
const unknownPage = await fetch(`${base}/a-page-that-does-not-exist`);
assert.equal(unknownPage.status, 404);
const unknownAPI = await fetch(`${base}/api/v1/a-route-that-does-not-exist`);
assert.equal(unknownAPI.status, 404);
assert.equal((await unknownAPI.json()).error.code, 'NOT_FOUND');
const news = await fetch(`${base}/news?source=release`, { redirect: 'manual' });
assert.equal(news.status, 308);
assert.equal(news.headers.get('location'), '/blog?source=release');
if (data.products[0]) {
  const slug = encodeURIComponent(data.products[0].slug);
  const product = await fetch(`${base}/products/${slug}`);
  const productHTML = await product.text();
  assert.equal(product.status, 200);
  assert(productHTML.includes('"@type":"Product"'));
  const alias = await fetch(`${base}/iphone/${slug}?variant=release`, { redirect: 'manual' });
  assert.equal(alias.status, 308);
  assert.equal(alias.headers.get('location'), `/products/${slug}?variant=release`);
}
console.log(
  'PASS: compiled artifacts, database readiness, published feed, headers, SEO, private noindex, redirects and 404s.',
);
