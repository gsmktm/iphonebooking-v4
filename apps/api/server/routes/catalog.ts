import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { owned } from '../core.js';
import { khaltiConfig } from '../services/khalti.js';
import {
  catalogFacets,
  catalogQuery,
  contentHref,
  findCatalog,
  productInclude,
  publicStoreSelect,
  serviceResults,
} from '../services/catalog-discovery.js';
export const catalog = Router();
catalog.get('/config', (_req, res) => {
  const onlinePayments = Boolean(khaltiConfig());
  res.json({
    environment: process.env.NODE_ENV ?? 'development',
    developmentData: process.env.SEED_DEVELOPMENT === 'true',
    currency: 'NPR',
    payments: onlinePayments ? ['STORE', 'KHALTI'] : ['STORE'],
    onlinePaymentsConfigured: onlinePayments,
    onlinePayments,
    paymentProvider: onlinePayments ? 'KHALTI' : null,
  });
});
catalog.get('/official-apple-models', async (req, res) => {
  const { category } = z
    .object({
      category: z.enum(['iphone', 'mac', 'ipad', 'watch', 'airpods', 'accessories']).optional(),
    })
    .parse(req.query);
  // Editorial reference records only. Never join these rows to live stock,
  // booking, price, checkout, or official reseller status.
  const models = await db.appleReferenceModel.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      category: true,
      name: true,
      summary: true,
      officialUrl: true,
      sourceCheckedAt: true,
    },
  });
  res.setHeader('Cache-Control', 'public, max-age=900');
  res.json(models);
});
// The Apple device history is independent of Product, ProductVariant and checkout.
// Sources are official Apple identification pages with separately licensed Commons photos.
const appleHistoryFamily = z.enum(['iphone', 'ipad', 'ipod', 'mac']);
const appleHistorySelect = {
  id: true,
  slug: true,
  family: true,
  name: true,
  introducedYear: true,
  modelNumbers: true,
  capacity: true,
  chip: true,
  sourceUrl: true,
  referenceUrl: true,
  imageUrl: true,
  imageSourceUrl: true,
  imageCredit: true,
  imageLicense: true,
  imageLicenseUrl: true,
  checkedAt: true,
} as const;
catalog.get('/apple-history/summary', async (_req, res) => {
  const [groups, dates] = await Promise.all([
    db.appleHistoryDevice.groupBy({
      by: ['family'],
      _count: { id: true },
    }),
    db.appleHistoryDevice.aggregate({
      _count: { id: true },
      _min: { introducedYear: true },
      _max: { introducedYear: true },
    }),
  ]);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    total: dates._count.id,
    earliest: dates._min.introducedYear,
    latest: dates._max.introducedYear,
    families: groups.map((item) => ({ family: item.family, count: item._count.id })),
  });
});
catalog.get('/apple-history', async (req, res) => {
  const query = z.object({
    family: appleHistoryFamily.optional(),
    year: z.coerce.number().int().min(1976).max(2100).optional(),
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).max(9999).default(1),
    pageSize: z.coerce.number().int().min(1).max(60).default(24),
  }).parse(req.query);
  const where = {
    ...(query.family ? { family: query.family } : {}),
    ...(query.year ? { introducedYear: query.year } : {}),
    ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
  };
  const [items, total] = await Promise.all([
    db.appleHistoryDevice.findMany({
      where,
      select: appleHistorySelect,
      orderBy: [{ introducedYear: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.appleHistoryDevice.count({ where }),
  ]);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.ceil(total / query.pageSize),
  });
});
catalog.get('/apple-history/:slug', async (req, res) => {
  const slug = z.string().regex(/^[a-z0-9-]{3,110}$/).parse(req.params.slug);
  const device = await db.appleHistoryDevice.findUnique({
    where: { slug },
    select: appleHistorySelect,
  });
  if (!device) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Historical device not found' } });
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(device);
});

catalog.get('/categories', async (_req, res) => res.json(await db.category.findMany()));
catalog.get('/catalog', async (req, res) => {
  const query = catalogQuery.parse(req.query);
  const [result, facets] = await Promise.all([findCatalog(query), catalogFacets(query)]);
  res.json({ ...result, pageCount: Math.ceil(result.total / result.pageSize), facets });
});
catalog.get('/products', async (req, res) => {
  // Existing category, comparison and home consumers expect an array.
  const query = catalogQuery.parse({ pageSize: 100, ...req.query });
  const { products } = await findCatalog(query);
  res.json(products);
});
catalog.get('/search', async (req, res) => {
  const { q } = z.object({ q: z.string().trim().max(100).default('') }).parse(req.query);
  const query = catalogQuery.parse({ q, pageSize: 6 });
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const [result, facets, content, categories] = await Promise.all([
    findCatalog(query),
    catalogFacets(query),
    db.cMSPage.findMany({
      where: {
        published: true,
        AND: terms.map((term) => ({
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
          ],
        })),
      },
      select: { slug: true, title: true, description: true },
      orderBy: [{ updatedAt: 'desc' }, { slug: 'asc' }],
      take: 5,
    }),
    db.category.findMany({
      where: {
        products: { some: { active: true, variants: { some: {} } } },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
      take: 8,
    }),
  ]);
  res.json({
    query: q,
    products: result.products,
    total: result.total,
    suggestions: [
      ...facets.models.slice(0, 6).map((model) => ({
        type: 'model',
        label: model.name,
        href: `/catalog?model=${encodeURIComponent(model.slug)}`,
      })),
      ...facets.storages
        .filter((value) => q && value.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 4)
        .map((storage) => ({
          type: 'storage',
          label: storage,
          href: `/catalog?storage=${encodeURIComponent(storage)}`,
        })),
      ...facets.colors
        .filter((value) => q && value.name.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 4)
        .map((color) => ({
          type: 'color',
          label: color.name,
          href: `/catalog?color=${encodeURIComponent(color.name)}`,
        })),
      ...categories.map((category) => ({
        type: 'category',
        label: category.name,
        href: `/catalog?category=${encodeURIComponent(category.slug)}`,
      })),
    ],
    content: content.map((page) => ({ ...page, href: contentHref(page.slug) })),
    services: serviceResults
      .filter((service) =>
        terms.every((term) =>
          `${service.title} ${service.description} ${service.terms}`.toLowerCase().includes(term),
        ),
      )
      .map(({ terms: _terms, ...service }) => service),
  });
});
catalog.get('/products/:slug', async (req, res) => {
  const product = owned(
    await db.product.findFirst({
      where: { slug: String(req.params.slug), active: true, variants: { some: {} } },
      include: {
        ...productInclude,
        accessories: {
          where: { accessory: { active: true, variants: { some: {} } } },
          include: { accessory: { include: productInclude } },
        },
      },
    }),
  );
  const related = await db.product.findMany({
    where: {
      active: true,
      categoryId: product.categoryId,
      id: { not: product.id },
      variants: { some: {} },
    },
    include: productInclude,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    take: 4,
  });
  res.json({ ...product, related });
});
catalog.get('/stores', async (_req, res) =>
  res.json(await db.store.findMany({ select: publicStoreSelect, orderBy: { name: 'asc' } })),
);
catalog.get('/content/:slug', async (req, res) =>
  res.json(
    owned(
      await db.cMSPage.findFirst({ where: { slug: String(req.params.slug), published: true } }),
    ),
  ),
);
catalog.get('/articles', async (_req, res) =>
  res.json(
    await db.cMSPage.findMany({
      where: { published: true, slug: { startsWith: 'support-' } },
      select: { slug: true, title: true, description: true },
    }),
  ),
);
catalog.post('/subscribe', async (req, res) => {
  const { email } = z
    .object({
      email: z
        .string()
        .email()
        .transform((v) => v.toLowerCase()),
      consent: z.literal(true),
    })
    .parse(req.body);
  await db.subscriber.upsert({ where: { email }, create: { email }, update: {} });
  res.status(201).json({ message: 'Your launch notification preference has been saved.' });
});
catalog.post('/events', async (req, res) => {
  const data = z
    .object({
      name: z.enum([
        'product_viewed',
        'variant_selected',
        'add_to_cart',
        'checkout_started',
        'prebooking_started',
        'tradein_started',
        'repair_started',
      ]),
      entityId: z.string().max(80).optional(),
    })
    .parse(req.body);
  await db.analyticsEvent.create({ data });
  res.status(202).json({ ok: true });
});
