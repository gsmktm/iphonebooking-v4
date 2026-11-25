import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { Prisma, type PriceIntelligence } from '@prisma/client';
import { z } from 'zod';
import { AppError, hash, permit } from '../core.js';
import { db } from '../db.js';

export const information = Router();

// ISO 3166-1 alpha-2 codes. Pseudo-regions are not retail markets.
const countryCodes = new Set(
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  ),
);
const currencyCodes = new Set(Intl.supportedValuesOf('currency'));
const id = z.string().trim().min(1).max(100);
const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => countryCodes.has(value), {
    message: 'Choose a valid ISO country code.',
  });
const currency = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => currencyCodes.has(value), {
    message: 'Choose a supported ISO currency code.',
  });
const sourceUrl = z
  .string()
  .trim()
  .max(1000)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  }, 'Use a public HTTP or HTTPS source link without credentials.');
const observationFields = z.object({
  productId: id.nullable().default(null),
  variantId: id.nullable().default(null),
  source: z.string().trim().min(2).max(160),
  sourceUrl: sourceUrl.nullable().default(null),
  countryCode: countryCode.nullable().default(null),
  currency: currency.nullable().default(null),
  priceKind: z.enum(['OFFICIAL', 'STORE']).nullable().default(null),
  observedPrice: z.number().int().positive().max(2147483647).nullable().default(null),
  observedAt: z
    .string()
    .datetime({ offset: true })
    .refine(
      (value) => new Date(value).getTime() <= Date.now(),
      'An observation cannot be dated in the future.',
    ),
  availability: z.string().trim().max(240).nullable().default(null),
  active: z.boolean().default(true),
  published: z.boolean().default(false),
});
type ObservationInput = z.infer<typeof observationFields>;

function completeObservation(value: ObservationInput) {
  return Boolean(
    value.productId &&
    value.variantId &&
    value.sourceUrl &&
    value.countryCode &&
    value.currency &&
    value.priceKind &&
    value.observedPrice,
  );
}
function revision(row: PriceIntelligence) {
  return hash(JSON.stringify(row));
}
function staffObservation(row: PriceIntelligence) {
  return { ...row, revision: revision(row) };
}
function auditSnapshot(row: PriceIntelligence): Prisma.InputJsonObject {
  return {
    productId: row.productId,
    variantId: row.variantId,
    source: row.source,
    sourceUrl: row.sourceUrl,
    countryCode: row.countryCode,
    currency: row.currency,
    priceKind: row.priceKind,
    observedPrice: row.observedPrice,
    observedAt: row.observedAt.toISOString(),
    availability: row.availability,
    active: row.active,
    published: row.published,
  };
}
async function validateContext(tx: Prisma.TransactionClient, data: ObservationInput) {
  if (data.published && !completeObservation(data)) {
    throw new AppError(
      422,
      'PRICE_CONTEXT_REQUIRED',
      'Add the product, configuration, country, currency, price type, amount and source link before publishing.',
    );
  }
  if (data.variantId && !data.productId) {
    throw new AppError(
      422,
      'PRICE_VARIANT_MISMATCH',
      'Choose the product that owns this configuration.',
    );
  }
  if (data.productId) {
    const product = await tx.product.findUnique({
      where: { id: data.productId },
      select: { active: true },
    });
    if (!product)
      throw new AppError(422, 'PRICE_PRODUCT_MISSING', 'The selected product does not exist.');
    if (data.published && !product.active)
      throw new AppError(
        409,
        'PRICE_PRODUCT_INACTIVE',
        'Only active products can have published observations.',
      );
  }
  if (
    data.variantId &&
    !(await tx.productVariant.findFirst({
      where: { id: data.variantId, productId: data.productId! },
      select: { id: true },
    }))
  ) {
    throw new AppError(
      422,
      'PRICE_VARIANT_MISMATCH',
      'This configuration does not belong to the selected product.',
    );
  }
}

const catalogSelection = {
  id: true,
  name: true,
  slug: true,
  image: true,
  variants: {
    select: { id: true, storage: true, color: true, region: true, price: true },
    orderBy: [{ storage: 'asc' as const }, { color: 'asc' as const }],
  },
} satisfies Prisma.ProductSelect;

information.get('/world-prices', async (req, res) => {
  const query = z
    .object({
      productId: id.optional(),
      variantId: id.optional(),
      countryCode: countryCode.optional(),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .parse(req.query);
  const products = await db.product.findMany({
    where: { active: true, variants: { some: {} } },
    select: catalogSelection,
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
  });
  const selectedProducts = query.productId
    ? products.filter((product) => product.id === query.productId)
    : products.slice(0, 1);
  const pairs = selectedProducts.map((product) => ({
    productId: product.id,
    variantId: {
      in: (query.variantId
        ? product.variants.filter((variant) => variant.id === query.variantId)
        : product.variants.slice(0, 1)
      ).map((variant) => variant.id),
    },
  }));
  const where: Prisma.PriceIntelligenceWhereInput = {
    published: true,
    active: true,
    OR: pairs,
    countryCode: query.countryCode ?? { in: [...countryCodes] },
    currency: { in: [...currencyCodes] },
    priceKind: { in: ['OFFICIAL', 'STORE'] },
    observedPrice: { gt: 0 },
    observedAt: { lte: new Date() },
    source: { not: '' },
    AND: [
      { OR: [{ sourceUrl: { startsWith: 'https://' } }, { sourceUrl: { startsWith: 'http://' } }] },
    ],
  };
  const take = 24;
  const [rows, total] = await db.$transaction([
    db.priceIntelligence.findMany({
      where,
      orderBy: [{ observedAt: 'desc' }, { id: 'asc' }],
      take,
      skip: (query.page - 1) * take,
    }),
    db.priceIntelligence.count({ where }),
  ]);
  const observations = rows
    .filter((row) => sourceUrl.safeParse(row.sourceUrl).success)
    .map((row) => ({
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      source: row.source,
      sourceUrl: row.sourceUrl,
      countryCode: row.countryCode,
      currency: row.currency,
      priceKind: row.priceKind,
      observedPrice: row.observedPrice,
      observedAt: row.observedAt,
      availability: row.availability,
    }));
  res.json({
    products,
    observations,
    page: query.page,
    total,
    pages: Math.ceil(total / take),
    localCurrency: 'NPR',
    conversionAvailable: false,
  });
});

information.get('/admin/price-intelligence/options', permit('product.read'), async (_req, res) => {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  res.json({
    products: await db.product.findMany({
      where: { active: true, variants: { some: {} } },
      select: catalogSelection,
      orderBy: { name: 'asc' },
    }),
    countries: [...countryCodes]
      .map((code) => ({ code, name: names.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    currencies: [...currencyCodes],
  });
});
information.get('/admin/price-intelligence', permit('product.read'), async (req, res) => {
  const { page, q } = z
    .object({
      page: z.coerce.number().int().min(1).max(10000).default(1),
      q: z.string().trim().max(100).default(''),
    })
    .parse(req.query);
  const where = { source: { contains: q, mode: 'insensitive' as const } };
  const [rows, total] = await db.$transaction([
    db.priceIntelligence.findMany({
      where,
      orderBy: [{ observedAt: 'desc' }, { id: 'asc' }],
      take: 25,
      skip: (page - 1) * 25,
    }),
    db.priceIntelligence.count({ where }),
  ]);
  res.json({ rows: rows.map(staffObservation), total, page, pages: Math.ceil(total / 25) });
});
information.post('/admin/price-intelligence', permit('product.update'), async (req, res) => {
  const data = observationFields.strict().parse(req.body);
  const row = await db.$transaction(
    async (tx) => {
      await validateContext(tx, data);
      const created = await tx.priceIntelligence.create({
        data: { ...data, observedAt: new Date(data.observedAt), trend: [] },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'price-intelligence.create',
          entity: 'PriceIntelligence',
          entityId: created.id,
          after: auditSnapshot(created),
          requestId: req.requestId,
        },
      });
      return created;
    },
    { isolationLevel: 'Serializable' },
  );
  res.status(201).json(staffObservation(row));
});
information.patch('/admin/price-intelligence/:id', permit('product.update'), async (req, res) => {
  const { expectedRevision, ...patch } = observationFields
    .partial()
    .extend({ expectedRevision: z.string().regex(/^[a-f0-9]{64}$/) })
    .strict()
    .parse(req.body);
  const row = await db.$transaction(
    async (tx) => {
      const before = await tx.priceIntelligence.findUnique({
        where: { id: String(req.params.id) },
      });
      if (!before) throw new AppError(404, 'NOT_FOUND', 'This price observation was not found.');
      if (revision(before) !== expectedRevision)
        throw new AppError(
          409,
          'PRICE_REVISION_CONFLICT',
          'This observation changed. Reload it before saving again.',
        );
      const data = observationFields.parse({
        ...before,
        observedAt: before.observedAt.toISOString(),
        ...patch,
      });
      await validateContext(tx, data);
      const updated = await tx.priceIntelligence.update({
        where: { id: before.id },
        data: { ...data, observedAt: new Date(data.observedAt) },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'price-intelligence.update',
          entity: 'PriceIntelligence',
          entityId: updated.id,
          before: auditSnapshot(before),
          after: auditSnapshot(updated),
          requestId: req.requestId,
        },
      });
      return updated;
    },
    { isolationLevel: 'Serializable' },
  );
  res.json(staffObservation(row));
});

const blogSummary = { slug: true, title: true, description: true, updatedAt: true } as const;
information.get('/blog', async (req, res) => {
  const { page, q } = z
    .object({
      page: z.coerce.number().int().min(1).max(10000).default(1),
      q: z.string().trim().max(100).default(''),
    })
    .parse(req.query);
  const where: Prisma.CMSPageWhereInput = {
    published: true,
    slug: { startsWith: 'blog-' },
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [rows, total] = await db.$transaction([
    db.cMSPage.findMany({
      where,
      select: blogSummary,
      orderBy: [{ updatedAt: 'desc' }, { slug: 'asc' }],
      take: 12,
      skip: (page - 1) * 12,
    }),
    db.cMSPage.count({ where }),
  ]);
  res.json({
    rows: rows.map((row) => ({ ...row, slug: row.slug.slice(5) })),
    total,
    page,
    pages: Math.ceil(total / 12),
  });
});
information.get('/blog/:slug', async (req, res) => {
  const slug = z
    .string()
    .min(1)
    .max(115)
    .regex(/^[a-z0-9-]+$/)
    .parse(req.params.slug);
  const article = await db.cMSPage.findFirst({ where: { slug: `blog-${slug}`, published: true } });
  if (!article)
    throw new AppError(
      404,
      'NOT_FOUND',
      'This article has not been published or is no longer available.',
    );
  res.json({ ...article, slug: article.slug.slice(5) });
});

export function passesImeiChecksum(imei: string) {
  if (!/^\d{15}$/.test(imei) || /^(\d)\1{14}$/.test(imei)) return false;
  const sum = [...imei].reduce((total, digit, index) => {
    const value = Number(digit) * (index % 2 === 1 ? 2 : 1);
    return total + (value > 9 ? value - 9 : value);
  }, 0);
  return sum % 10 === 0;
}
information.post(
  '/imei-check',
  rateLimit({
    windowMs: 60000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many format checks. Wait one minute and try again.',
          requestId: req.requestId,
        },
      }),
  }),
  (req, res) => {
    const { imei } = z
      .object({
        imei: z
          .string()
          .trim()
          .regex(/^\d{15}$/, 'Enter exactly 15 digits.'),
      })
      .strict()
      .parse(req.body);
    res.json({
      valid: passesImeiChecksum(imei),
      check: 'FORMAT_ONLY',
      last4: imei.slice(-4),
      message:
        'This checks 15-digit formatting and the Luhn check digit only. It does not verify authenticity, ownership, warranty, activation, blacklist status or manufacturer records.',
    });
  },
);
