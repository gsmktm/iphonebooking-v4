import type { Request, Response } from 'express';
import { readFile } from 'node:fs/promises';
import { db } from '../db.js';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export const origin = () =>
  process.env.PUBLIC_ORIGIN ?? process.env.APP_ORIGIN ?? 'http://localhost:5173';
export async function sitemap(_req: Request, res: Response) {
  const [products, categories, pages] = await Promise.all([
    db.product.findMany({ where: { active: true }, select: { slug: true } }),
    db.category.findMany({ select: { slug: true } }),
    db.cMSPage.findMany({
      where: { published: true, slug: { not: 'home' } },
      select: { slug: true },
    }),
  ]);
  const paths = [
    '',
    '/store',
    '/prebook',
    '/trade-in',
    '/exchange',
    '/repair',
    '/stores',
    '/support',
    ...products.map((p) => `/products/${p.slug}`),
    ...categories.map((c) => `/${c.slug}`),
    ...pages.map((p) => `/${p.slug.startsWith('support-') ? 'support' : 'policies'}/${p.slug}`),
  ];
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${escape(origin() + p)}</loc></url>`).join('')}</urlset>`,
    );
}
export async function storefrontDocument(req: Request, res: Response) {
  let title = 'iPhoneBooking — Your Apple world. All connected.',
    description = 'Discover, book, upgrade, and care for your devices. From the Himalayas.',
    structured: unknown = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'iPhoneBooking',
      url: origin(),
    };
  const productSlug = req.path.match(/^\/products\/([^/]+)$/)?.[1];
  if (productSlug) {
    const p = await db.product.findUnique({
      where: { slug: productSlug },
      include: { variants: { include: { stock: true } } },
    });
    if (p?.active) {
      title = `${p.name} — iPhoneBooking`;
      description = p.tagline;
      if (p.variants.length)
        structured = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          description: p.description,
          brand: { '@type': 'Brand', name: 'Apple' },
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'NPR',
            lowPrice: Math.min(...p.variants.map((v) => v.price)) / 100,
            highPrice: Math.max(...p.variants.map((v) => v.price)) / 100,
            offerCount: p.variants.length,
          },
        };
    } else res.status(404);
  }
  const contentSlug = req.path.match(/^\/(?:policies|support|campaign)\/([^/]+)$/)?.[1];
  if (contentSlug) {
    const p = await db.cMSPage.findFirst({ where: { slug: contentSlug, published: true } });
    if (p) {
      title = `${p.title} — iPhoneBooking`;
      description = p.description;
    } else res.status(404);
  }
  const canonical = origin() + req.path;
  const noindex =
    /^\/(admin|account|checkout|confirmation|cart|track|wishlist)/.test(req.path) ||
    process.env.SEED_DEVELOPMENT === 'true' ||
    Object.keys(req.query).length > 0;
  const shareImage = req.path === '/' ? '/images/himalayan-banner.png' : '/images/hero.webp';
  const heroPreload =
    req.path === '/'
      ? '<link rel="preload" as="image" href="/images/himalayan-banner.png" fetchpriority="high"/>'
      : '';
  const tags = `${heroPreload}<link rel="canonical" href="${escape(canonical)}"/><meta name="robots" content="${noindex ? 'noindex,nofollow' : 'index,follow'}"/><meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(description)}"/><meta property="og:url" content="${escape(canonical)}"/><meta property="og:image" content="${origin()}${shareImage}"/><meta name="twitter:card" content="summary_large_image"/><script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>`;
  const html = (await readFile('dist/index.html', 'utf8'))
    .replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escape(description)}"/>`,
    )
    .replace('</head>', tags + '</head>');
  res.type('html').set('Cache-Control', 'no-store').send(html);
}
