import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';

const price = z.coerce.number().int().min(0).max(2_147_483_647).optional();
export const catalogQuery = z
  .object({
    category: z.string().trim().max(100).optional(),
    model: z.string().trim().max(100).optional(),
    ids: z
      .string()
      .max(20_000)
      .regex(/^[a-zA-Z0-9,_-]*$/)
      .optional(),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(['featured', 'price-low', 'price-high', 'newest']).default('featured'),
    storage: z.string().max(100).optional(),
    color: z.string().max(100).optional(),
    stock: z.enum(['in-stock', 'out-of-stock']).optional(),
    preorder: z.enum(['true']).optional(),
    deals: z.enum(['true']).optional(),
    minPrice: price,
    maxPrice: price,
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(24),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    { path: ['maxPrice'], message: 'Maximum price must be at least the minimum price.' },
  );
export type CatalogQuery = z.infer<typeof catalogQuery>;

// Public stock responses must never grow with the retailer's internal Store metadata.
export const publicStoreSelect = {
  id: true,
  slug: true,
  name: true,
  address: true,
  hours: true,
  phone: true,
  services: true,
} satisfies Prisma.StoreSelect;

export const productInclude = {
  category: true,
  variants: {
    include: { stock: { include: { store: { select: publicStoreSelect } } } },
    orderBy: [{ price: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ProductInclude;

export function variantWhere(query: CatalogQuery): Prisma.ProductVariantWhereInput {
  const terms = query.q?.split(/\s+/).filter(Boolean) ?? [];
  return {
    ...(query.storage ? { storage: query.storage } : {}),
    ...(query.color ? { color: query.color } : {}),
    ...(query.preorder ? { preorder: true } : {}),
    ...(query.deals ? { comparePrice: { gt: db.productVariant.fields.price } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? { price: { gte: query.minPrice, lte: query.maxPrice } }
      : {}),
    ...(query.stock === 'in-stock' ? { stock: { some: { available: { gt: 0 } } } } : {}),
    ...(query.stock === 'out-of-stock' ? { stock: { none: { available: { gt: 0 } } } } : {}),
    ...(terms.length
      ? {
          AND: terms.map((term) => ({
            OR: [
              { sku: { contains: term, mode: 'insensitive' } },
              { storage: { contains: term, mode: 'insensitive' } },
              { color: { contains: term, mode: 'insensitive' } },
              {
                product: {
                  OR: [
                    { name: { contains: term, mode: 'insensitive' } },
                    { tagline: { contains: term, mode: 'insensitive' } },
                    { description: { contains: term, mode: 'insensitive' } },
                    { category: { name: { contains: term, mode: 'insensitive' } } },
                    { category: { slug: { contains: term, mode: 'insensitive' } } },
                  ],
                },
              },
            ],
          })),
        }
      : {}),
  };
}

export function productWhere(query: CatalogQuery): Prisma.ProductWhereInput {
  return {
    active: true,
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.model ? { slug: query.model } : {}),
    ...(query.ids !== undefined ? { id: { in: query.ids.split(',').filter(Boolean) } } : {}),
    variants: { some: variantWhere(query) },
  };
}

export async function findCatalog(query: CatalogQuery) {
  const where = productWhere(query);
  const total = await db.product.count({ where });
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const skip = (page - 1) * query.pageSize;
  const include = {
    ...productInclude,
    variants: {
      ...productInclude.variants,
      where: variantWhere(query),
      orderBy: [{ price: 'asc' as const }, { id: 'asc' as const }],
    },
  };
  let products;
  if (query.sort.startsWith('price')) {
    // Order all matching products by their matching configurations before pagination.
    const ordered = await db.productVariant.groupBy({
      by: ['productId'],
      where: { ...variantWhere(query), product: where },
      _min: { price: true },
      orderBy: [
        { _min: { price: query.sort === 'price-high' ? 'desc' : 'asc' } },
        { productId: 'asc' },
      ],
      skip,
      take: query.pageSize,
    });
    const rows = await db.product.findMany({
      where: { id: { in: ordered.map((row) => row.productId) } },
      include,
    });
    const positions = new Map(ordered.map((row, index) => [row.productId, index]));
    products = rows.sort((a, b) => positions.get(a.id)! - positions.get(b.id)!);
  } else {
    products = await db.product.findMany({
      where,
      include,
      orderBy:
        query.sort === 'newest'
          ? [{ createdAt: 'desc' }, { id: 'asc' }]
          : [{ featured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      skip,
      take: query.pageSize,
    });
  }
  return { products, total, page, pageSize: query.pageSize };
}

export async function catalogFacets(query: CatalogQuery) {
  const scope = catalogQuery.parse({
    category: query.category,
    model: query.model,
    ids: query.ids,
    q: query.q,
    preorder: query.preorder,
  });
  const [rows, models] = await Promise.all([
    db.productVariant.groupBy({
      by: ['storage', 'color', 'colorHex'],
      where: { ...variantWhere(scope), product: productWhere(scope) },
      _min: { price: true },
      _max: { price: true },
    }),
    db.product.findMany({
      where: productWhere({ ...scope, model: undefined }),
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  return {
    models,
    storages: [...new Set(rows.map((row) => row.storage))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    ),
    colors: [
      ...new Map(rows.map((row) => [row.color, { name: row.color, hex: row.colorHex }])).values(),
    ].sort((a, b) => a.name.localeCompare(b.name)),
    price: rows.length
      ? {
          min: Math.min(...rows.map((row) => row._min.price!)),
          max: Math.max(...rows.map((row) => row._max.price!)),
        }
      : null,
  };
}

export const serviceResults = [
  {
    id: 'repair',
    title: 'Book a repair',
    description: 'Request a diagnosis and review your repair quote.',
    href: '/repair',
    terms: 'service fix broken battery screen care',
  },
  {
    id: 'trade-in',
    title: 'Trade in your device',
    description: 'Get an estimate before an in-store inspection.',
    href: '/trade-in',
    terms: 'upgrade exchange valuation offer',
  },
  {
    id: 'sell-device',
    title: 'Sell your device',
    description: 'Start a device valuation and review the final offer.',
    href: '/sell-device',
    terms: 'resale valuation used',
  },
  {
    id: 'stores',
    title: 'Find a store',
    description: 'View store addresses, opening hours, and available services.',
    href: '/stores',
    terms: 'pickup location visit address contact',
  },
  {
    id: 'track',
    title: 'Track your order',
    description: 'Check your order with its number and private receipt key.',
    href: '/track',
    terms: 'reservation delivery status booking',
  },
  {
    id: 'support',
    title: 'Help & support',
    description: 'Read the help guides or start a support conversation.',
    href: '/support',
    terms: 'help support contact warranty',
  },
];

export function contentHref(slug: string) {
  if (slug === 'home') return '/';
  if (slug.startsWith('blog-')) return `/blog/${encodeURIComponent(slug.slice(5))}`;
  if (
    [
      'about-us',
      'contact-us',
      'careers',
      'press-room',
      'history',
      'cookies',
      'accessibility',
    ].includes(slug)
  )
    return `/${slug}`;
  if (slug.startsWith('support-')) return `/support/${encodeURIComponent(slug)}`;
  if (
    [
      'privacy',
      'terms',
      'returns',
      'warranty',
      'repair-terms',
      'trade-in-terms',
      'prebooking-terms',
    ].includes(slug)
  )
    return `/policies/${encodeURIComponent(slug)}`;
  return `/campaign/${encodeURIComponent(slug)}`;
}
