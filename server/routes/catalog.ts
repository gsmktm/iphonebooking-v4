import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { owned } from '../core.js';
export const catalog = Router();
const include = { category: true, variants: { include: { stock: { include: { store: true } } } } };
catalog.get('/config', (_req, res) =>
  res.json({
    environment: process.env.NODE_ENV ?? 'development',
    developmentData: process.env.SEED_DEVELOPMENT === 'true',
    currency: 'NPR',
    payments: ['STORE'],
    onlinePaymentsConfigured: false,
  }),
);
catalog.get('/categories', async (_req, res) => res.json(await db.category.findMany()));
catalog.get('/products', async (req, res) => {
  const q = z
    .object({
      category: z.string().optional(),
      q: z.string().max(100).optional(),
      sort: z.enum(['featured', 'price-low', 'price-high', 'newest']).optional(),
      storage: z.string().optional(),
      color: z.string().optional(),
      stock: z.string().optional(),
    })
    .parse(req.query);
  const products = await db.product.findMany({
    where: {
      active: true,
      ...(q.category ? { category: { slug: q.category } } : {}),
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' } },
              { variants: { some: { sku: { contains: q.q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
      variants: {
        some: {
          ...(q.storage ? { storage: q.storage } : {}),
          ...(q.color ? { color: q.color } : {}),
          ...(q.stock === 'in-stock' ? { stock: { some: { available: { gt: 0 } } } } : {}),
        },
      },
    },
    include,
    orderBy: q.sort === 'newest' ? { createdAt: 'desc' } : { featured: 'desc' },
    take: 100,
  });
  if (q.sort?.startsWith('price'))
    products.sort(
      (a, b) =>
        (Math.min(...a.variants.map((v) => v.price)) -
          Math.min(...b.variants.map((v) => v.price))) *
        (q.sort === 'price-high' ? -1 : 1),
    );
  res.json(products);
});
catalog.get('/products/:slug', async (req, res) =>
  res.json(
    owned(
      await db.product.findFirst({
        where: { slug: String(req.params.slug), active: true, variants: { some: {} } },
        include: {
          ...include,
          accessories: {
            where: { accessory: { active: true, variants: { some: {} } } },
            include: { accessory: { include } },
          },
        },
      }),
    ),
  ),
);
catalog.get('/stores', async (_req, res) => res.json(await db.store.findMany()));
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
