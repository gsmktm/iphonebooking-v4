import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, permit, requireUser } from '../core.js';
import { publicReview, publicReviewSelect, reviewEligibility } from '../services/reviews.js';

export const reviews = Router();
const pagination = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) });
const ownSelect = {
  id: true,
  rating: true,
  title: true,
  body: true,
  status: true,
  createdAt: true,
} as const;

reviews.get('/products/:slug/reviews', async (req, res) => {
  const { page } = pagination.parse(req.query);
  const product = owned(
    await db.product.findFirst({
      where: { slug: String(req.params.slug), active: true },
      select: { id: true },
    }),
  );
  const where = { productId: product.id, status: 'PUBLISHED' as const };
  const [rows, summary, ownReview, eligibility] = await Promise.all([
    db.review.findMany({
      where,
      select: publicReviewSelect,
      take: 6,
      skip: (page - 1) * 6,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    db.review.aggregate({ where, _count: { id: true }, _avg: { rating: true } }),
    req.user
      ? db.review.findUnique({
          where: { userId_productId: { userId: req.user.id, productId: product.id } },
          select: ownSelect,
        })
      : null,
    req.user ? reviewEligibility(product.id, req.user.id) : null,
  ]);
  res.json({
    rows: rows.map(publicReview),
    total: summary._count.id,
    average: summary._avg.rating,
    page,
    pages: Math.ceil(summary._count.id / 6),
    ownReview,
    canReview: Boolean(eligibility && !ownReview),
  });
});

reviews.post('/products/:slug/reviews', requireUser, async (req, res) => {
  const data = z
    .object({
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().min(3).max(120),
      body: z.string().trim().min(20).max(2000),
    })
    .strict()
    .parse(req.body);
  const result = await db.$transaction(
    async (tx) => {
      const product = owned(
        await tx.product.findFirst({
          where: { slug: String(req.params.slug), active: true },
          select: { id: true },
        }),
      );
      const previous = await tx.review.findUnique({
        where: { userId_productId: { userId: req.user!.id, productId: product.id } },
      });
      if (previous)
        throw new AppError(
          409,
          'REVIEW_EXISTS',
          'You have already shared a review for this product.',
        );
      const item = await tx.orderItem.findFirst({
        where: {
          variant: { productId: product.id },
          order: { userId: req.user!.id, status: 'DELIVERED' },
          review: null,
        },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      if (!item)
        throw new AppError(
          403,
          'VERIFIED_PURCHASE_REQUIRED',
          'Reviews are available after your order has been delivered to your account.',
        );
      return tx.review.create({
        data: { ...data, productId: product.id, userId: req.user!.id, orderItemId: item.id },
        select: ownSelect,
      });
    },
    { isolationLevel: 'Serializable' },
  );
  res.status(201).json(result);
});

reviews.get('/admin/reviews', permit('review.read'), async (req, res) => {
  const { page, q, status } = pagination
    .extend({
      q: z.string().trim().max(100).default(''),
      status: z.enum(['PENDING', 'PUBLISHED', 'REJECTED']).optional(),
    })
    .parse(req.query);
  const where = {
    ...(status ? { status } : {}),
    OR: [
      { title: { contains: q, mode: 'insensitive' as const } },
      { product: { name: { contains: q, mode: 'insensitive' as const } } },
    ],
  };
  const [rows, total] = await db.$transaction([
    db.review.findMany({
      where,
      include: {
        product: { select: { name: true, slug: true } },
        user: { select: { name: true } },
      },
      take: 25,
      skip: (page - 1) * 25,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    db.review.count({ where }),
  ]);
  res.json({ rows, total, page, pageSize: 25 });
});

reviews.patch('/admin/reviews/:id', permit('review.moderate'), async (req, res) => {
  const data = z
    .object({
      status: z.enum(['PUBLISHED', 'REJECTED']),
      reason: z.string().trim().min(5).max(300),
      expectedUpdatedAt: z.string().datetime(),
    })
    .strict()
    .parse(req.body);
  const result = await db.$transaction(
    async (tx) => {
      const before = owned(await tx.review.findUnique({ where: { id: String(req.params.id) } }));
      if (before.userId === req.user!.id)
        throw new AppError(
          403,
          'INDEPENDENT_MODERATION_REQUIRED',
          'Another staff member must moderate your review.',
        );
      const updated = await tx.review.updateMany({
        where: { id: before.id, updatedAt: new Date(data.expectedUpdatedAt) },
        data: { status: data.status },
      });
      if (updated.count !== 1)
        throw new AppError(
          409,
          'REVIEW_CHANGED',
          'This review changed. Reload it before making another decision.',
        );
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'review.moderate',
          entity: 'Review',
          entityId: before.id,
          before: { status: before.status },
          after: { status: data.status, reason: data.reason },
          requestId: req.requestId,
        },
      });
      return tx.review.findUniqueOrThrow({ where: { id: before.id } });
    },
    { isolationLevel: 'Serializable' },
  );
  res.json(result);
});
