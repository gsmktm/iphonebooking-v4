import { Router } from 'express';
import { db } from '../db.js';
import { contentFields } from '../schemas/content.js';
import { productInclude, publicStoreSelect } from '../services/catalog-discovery.js';
import { publicReview, publicReviewSelect } from '../services/reviews.js';

export const home = Router();
home.get('/home', async (_req, res) => {
  const catalogWhere = { active: true, variants: { some: {} } };
  const reviewWhere = { status: 'PUBLISHED' as const, product: catalogWhere };
  const [
    products,
    iphones,
    categories,
    content,
    stores,
    articles,
    reviews,
    reviewSummary,
    observations,
  ] = await Promise.all([
    db.product.findMany({
      where: catalogWhere,
      include: productInclude,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      take: 12,
    }),
    db.product.findMany({
      where: { ...catalogWhere, category: { slug: 'iphone' } },
      include: productInclude,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      take: 4,
    }),
    db.category.findMany({ where: { products: { some: catalogWhere } }, orderBy: { id: 'asc' } }),
    db.cMSPage.findFirst({ where: { slug: 'home', published: true } }),
    db.store.findMany({ select: publicStoreSelect, orderBy: { name: 'asc' }, take: 6 }),
    db.cMSPage.findMany({
      where: { published: true, slug: { startsWith: 'blog-' } },
      select: { title: true, slug: true, description: true, updatedAt: true },
      orderBy: [{ updatedAt: 'desc' }, { slug: 'asc' }],
      take: 3,
    }),
    db.review.findMany({
      where: reviewWhere,
      select: publicReviewSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 3,
    }),
    db.review.aggregate({ where: reviewWhere, _count: { id: true }, _avg: { rating: true } }),
    db.priceIntelligence.findMany({
      where: {
        published: true,
        active: true,
        observedPrice: { gt: 0 },
        productId: { not: null },
        variantId: { not: null },
        countryCode: { not: null },
        currency: { not: null },
        priceKind: { in: ['STORE', 'OFFICIAL'] },
        observedAt: { lte: new Date() },
      },
      select: { productId: true, variantId: true, countryCode: true, sourceUrl: true },
      take: 100,
      orderBy: { observedAt: 'desc' },
    }),
  ]);
  const parsedContent = content ? contentFields.safeParse(content) : null;
  const blocks = parsedContent?.success ? parsedContent.data.blocks : [];
  const marketPairs = observations.filter((row) => {
    try {
      const url = new URL(row.sourceUrl ?? '');
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  });
  const validVariants = marketPairs.length
    ? await db.productVariant.findMany({
        where: { id: { in: marketPairs.map((row) => row.variantId!) }, product: catalogWhere },
        select: { id: true, productId: true },
      })
    : [];
  const visibleMarkets = marketPairs.filter((row) =>
    validVariants.some(
      (variant) => variant.id === row.variantId && variant.productId === row.productId,
    ),
  );
  res.json({
    products,
    iphones,
    categories,
    stores,
    hero: blocks.find((block) => block.type === 'hero') ?? null,
    sections: blocks.filter((block) => block.type === 'section'),
    articles: articles.map((article) => ({ ...article, slug: article.slug.slice(5) })),
    reviews: reviews.map(publicReview),
    reviewSummary: { total: reviewSummary._count.id, average: reviewSummary._avg.rating },
    marketSummary: {
      sources: visibleMarkets.length,
      countries: [...new Set(visibleMarkets.map((row) => row.countryCode))].length,
    },
  });
});
