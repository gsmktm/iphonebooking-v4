import type { Prisma } from '@prisma/client';
import { db } from '../db.js';

export const publicReviewSelect = {
  id: true,
  rating: true,
  title: true,
  body: true,
  createdAt: true,
  user: { select: { name: true } },
  product: { select: { name: true, slug: true } },
} satisfies Prisma.ReviewSelect;

export function publicReview(row: Prisma.ReviewGetPayload<{ select: typeof publicReviewSelect }>) {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    author: row.user.name.trim().split(/\s+/)[0] || 'Customer',
    verifiedPurchase: true,
    product: row.product,
  };
}

export function reviewEligibility(productId: string, userId: string) {
  return db.orderItem.findFirst({
    where: { variant: { productId }, order: { userId, status: 'DELIVERED' }, review: null },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
}
