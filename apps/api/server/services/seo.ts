import type { Request, Response } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '../db.js';
import { config, webDistPath } from '../config.js';
import { contentHref } from './catalog-discovery.js';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export const origin = () => config.publicOrigin;
const redirects: Record<string, string> = {
  '/catalog': '/store',
  '/news': '/blog',
  '/about': '/about-us',
  '/refund-policy': '/policies/returns',
  '/warranty': '/policies/warranty',
  '/admin/dashboard': '/admin',
  '/admin/preorders': '/admin/bookings',
  '/admin/cms': '/admin/content',
  '/admin/imei': '/admin/units',
  '/admin/audit': '/admin/audit-logs',
  '/account/preorders': '/account/orders',
  '/account/wishlist': '/wishlist',
  '/pre-order': '/prebook',
  '/compare-iphones': '/compare',
  '/track-order': '/track',
  '/repair-booking': '/repair',
  '/privacy': '/policies/privacy',
  '/terms': '/policies/terms',
  '/returns': '/policies/returns',
  '/shipping': '/support/support-delivery',
  '/warranty-info': '/policies/warranty',
  '/dashboard': '/account',
  '/preorders': '/account/orders',
  '/iphone-18': '/iphone',
  '/emi-options': '/support',
};
for (const section of [
  'profile',
  'orders',
  'repairs',
  'trade-ins',
  'addresses',
  'notifications',
  'security',
])
  redirects[`/${section}`] = `/account/${section}`;
const pageTitles: Record<string, string> = {
  '/': 'Book the Future.',
  '/store': 'The Apple device collection',
  '/search': 'Search the Apple device collection',
  '/prebook': 'Pre-book your next device',
  '/deals': 'Catalog offers',
  '/compare': 'Compare Apple devices',
  '/trade-in': 'Trade in your device',
  '/exchange': 'Exchange your device',
  '/sell-device': 'Sell your device',
  '/repair': 'Book a repair',
  '/stores': 'Find a store',
  '/support': 'Help & support',
  '/faq': 'Help & support',
  '/blog': 'The iPhoneBooking journal',
  '/world-price-map': 'World price intelligence',
  '/retailer-network': 'Retailer network',
  '/about-us': 'From the Himalayas to the World.',
  '/contact-us': 'Contact iPhoneBooking',
  '/imei-check': 'IMEI format check',
};
const privateRoute = (url: string) =>
  /^\/repair\/[^/]+$/.test(url) ||
  /^\/(admin|account|retailer|login|register|forgot-password|reset-password|verify-email|checkout|confirmation|cart|track|wishlist|search)(\/|$)/.test(
    url,
  );
export async function sitemap(_req: Request, res: Response) {
  const [products, categories, pages, stores] = await Promise.all([
    db.product.findMany({
      where: { active: true, variants: { some: {} } },
      select: { slug: true },
    }),
    db.category.findMany({ select: { slug: true } }),
    db.cMSPage.findMany({
      where: { published: true, slug: { not: 'home' } },
      select: { slug: true, updatedAt: true },
    }),
    db.store.findMany({ select: { slug: true } }),
  ]);
  const categoryPages = new Set([
    'iphone',
    'mac',
    'ipad',
    'watch',
    'airpods',
    'accessories',
    'vision',
    'home',
  ]);
  const paths = new Set([
    ...Object.keys(pageTitles).filter((p) => !['/imei-check', '/faq'].includes(p)),
    ...products.map((p) => `/products/${encodeURIComponent(p.slug)}`),
    ...categories.filter((c) => categoryPages.has(c.slug)).map((c) => `/${c.slug}`),
    ...pages.map((p) => contentHref(p.slug)),
    ...stores.map((s) => `/stores/${encodeURIComponent(s.slug)}`),
  ]);
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...paths].map((p) => `<url><loc>${escape(origin() + p)}</loc></url>`).join('')}</urlset>`,
    );
}
export function robots(_req: Request, res: Response) {
  res
    .type('text/plain')
    .send(
      `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /confirmation\nDisallow: /retailer/\nDisallow: /track\nSitemap: ${origin()}/sitemap.xml\n`,
    );
}
export async function storefrontDocument(req: Request, res: Response) {
  if (redirects[req.path])
    return res.redirect(
      308,
      redirects[req.path] +
        (req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''),
    );
  const alias = req.path.match(/^\/(iphone|news)\/([^/]+)$/);
  if (alias)
    return res.redirect(
      308,
      `/${alias[1] === 'iphone' ? 'products' : 'blog'}/${alias[2]}` +
        (req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''),
    );
  let title =
    pageTitles[req.path] ??
    req.path.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ??
    'iPhoneBooking';
  let description =
    'Discover, compare, pre-book, trade in, and care for your Apple devices. From the Himalayas to the World.';
  let unpublishedCategory = false;
  let known =
    Boolean(pageTitles[req.path]) ||
    privateRoute(req.path) ||
    ['/careers', '/press-room', '/history', '/cookies', '/accessibility'].includes(req.path);
  let structured: unknown = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'iPhoneBooking',
    url: origin(),
  };
  const productSlug = req.path.match(/^\/(?:products|iphone)\/([^/]+)$/)?.[1];
  if (productSlug) {
    const product = await db.product.findFirst({
      where: { slug: decodeURIComponent(productSlug), active: true, variants: { some: {} } },
      include: { variants: { include: { stock: true } } },
    });
    if (product) {
      known = true;
      title = product.name;
      description = product.tagline;
      structured = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        brand: { '@type': 'Brand', name: 'Apple' },
        url: origin() + req.path,
        offers: product.variants.map((v) => ({
          '@type': 'Offer',
          sku: v.sku,
          url: `${origin()}${req.path}?variant=${encodeURIComponent(v.id)}`,
          priceCurrency: 'NPR',
          price: v.price / 100,
          availability: v.preorder
            ? 'https://schema.org/PreOrder'
            : v.stock.some((s) => s.available > 0)
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        })),
      };
    }
  }
  const contentSlug = req.path.match(/^\/(?:policies|support|campaign)\/([^/]+)$/)?.[1];
  const blogSlug = req.path.match(/^\/(?:blog|news)\/([^/]+)$/)?.[1];
  if (contentSlug || blogSlug) {
    const page = await db.cMSPage.findFirst({
      where: {
        slug: blogSlug ? `blog-${decodeURIComponent(blogSlug)}` : decodeURIComponent(contentSlug!),
        published: true,
      },
    });
    if (page) {
      known = true;
      title = page.title;
      description = page.description;
      structured = {
        '@context': 'https://schema.org',
        '@type': blogSlug ? 'Article' : 'WebPage',
        headline: page.title,
        description: page.description,
        dateModified: page.updatedAt.toISOString(),
        url: origin() + req.path,
      };
    }
  }
  const storeSlug = req.path.match(/^\/stores\/([^/]+)$/)?.[1];
  if (storeSlug) {
    const store = await db.store.findUnique({
      where: { slug: decodeURIComponent(storeSlug) },
      select: { name: true, address: true },
    });
    if (store) {
      known = true;
      title = store.name;
      description = store.address;
    }
  }
  if (/^\/(iphone|mac|ipad|watch|airpods|accessories|vision|home)$/.test(req.path)) {
    const slug = req.path.slice(1);
    const category = await db.category.findUnique({
      where: { slug },
      select: { name: true, description: true },
    });
    // Public SPA category pages stay reachable before the first verified
    // catalog item is published; empty categories must not be indexed.
    known = true;
    if (category) {
      title = category.name;
      description = category.description;
    } else {
      unpublishedCategory = true;
      title =
        {
          iphone: 'iPhone',
          mac: 'Mac',
          ipad: 'iPad',
          watch: 'Apple Watch',
          airpods: 'AirPods',
          accessories: 'Accessories',
          vision: 'Apple Vision',
          home: 'TV & Home',
        }[slug] ?? 'Devices';
      description =
        'Explore the collection. Product availability and verified Nepal prices appear when the catalog is published.';
    }
  }
  if (!known) {
    res.status(404);
    title = 'Page not found';
    description =
      'This page could not be found. Explore the iPhoneBooking store or contact support.';
    structured = null;
  }
  title = `${title} — iPhoneBooking`;
  const canonical = origin() + req.path;
  const noindex =
    !known ||
    unpublishedCategory ||
    privateRoute(req.path) ||
    process.env.SEED_DEVELOPMENT === 'true' ||
    Object.keys(req.query).length > 0;
  const shareImage = '/images/himalayas-v2.jpg';
  const tags = `<link rel="canonical" href="${escape(canonical)}"/><meta name="robots" content="${noindex ? 'noindex,nofollow' : 'index,follow'}"/><meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(description)}"/><meta property="og:url" content="${escape(canonical)}"/><meta property="og:image" content="${escape(origin() + shareImage)}"/><meta name="twitter:card" content="summary_large_image"/>${structured ? `<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>` : ''}`;
  const html = (await readFile(path.join(webDistPath, 'index.html'), 'utf8'))
    .replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escape(description)}"/>`,
    )
    .replace('</head>', tags + '</head>');
  res.type('html').set('Cache-Control', 'no-store').send(html);
}
