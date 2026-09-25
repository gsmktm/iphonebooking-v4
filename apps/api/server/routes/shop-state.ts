import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, requireUser } from '../core.js';
export const shopState = Router();
shopState.use(requireUser);
shopState.get('/shop-state', async (req, res) => {
  const state = await db.$transaction(
    async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: { shopRevision: true },
      });
      const [cart, wishlist] = await Promise.all([
        tx.cartItem.findMany({
          where: { userId: req.user!.id },
          include: { variant: { include: { product: true } } },
          orderBy: { id: 'asc' },
        }),
        tx.wishlist.findMany({ where: { userId: req.user!.id }, select: { productId: true } }),
      ]);
      return {
        accountId: req.user!.id,
        revision: user.shopRevision,
        wishlist: wishlist.map((w) => w.productId),
        cart: cart.map(({ variant: v, quantity }) => ({
          variantId: v.id,
          productId: v.productId,
          slug: v.product.slug,
          name: v.product.name,
          image: v.product.image,
          color: v.color,
          storage: v.storage,
          price: v.price,
          deposit: v.deposit,
          preorder: v.preorder,
          quantity,
        })),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  res.json(state);
});
shopState.put('/shop-state', async (req, res) => {
  const data = z
    .object({
      accountId: z.string().min(1),
      revision: z.number().int().min(0),
      cart: z
        .array(
          z
            .object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(5) })
            .strict(),
        )
        .max(20),
      wishlist: z.array(z.string().min(1)).max(200),
    })
    .strict()
    .parse(req.body);
  if (data.accountId !== req.user!.id)
    throw new AppError(
      409,
      'ACCOUNT_CHANGED',
      'Your signed-in account changed. Reload your account before syncing.',
    );
  if (
    new Set(data.cart.map((i) => i.variantId)).size !== data.cart.length ||
    new Set(data.wishlist).size !== data.wishlist.length
  )
    throw new AppError(
      422,
      'DUPLICATE_ITEM',
      'Each saved configuration or wishlist product may appear only once.',
    );
  await db.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({
      where: { id: req.user!.id, shopRevision: data.revision },
      data: { shopRevision: { increment: 1 } },
    });
    if (!claimed.count)
      throw new AppError(
        409,
        'SHOP_STATE_CHANGED',
        'Your saved items changed on another device. Review the saved selection or explicitly keep this device’s selection.',
      );
    const [variants, products] = await Promise.all([
      tx.productVariant.count({ where: { id: { in: data.cart.map((i) => i.variantId) } } }),
      tx.product.count({ where: { id: { in: data.wishlist } } }),
    ]);
    if (variants !== data.cart.length || products !== data.wishlist.length)
      throw new AppError(
        422,
        'SAVED_ITEM_UNAVAILABLE',
        'A saved item no longer exists. Remove it before syncing again.',
      );
    await tx.cartItem.deleteMany({ where: { userId: req.user!.id } });
    await tx.wishlist.deleteMany({ where: { userId: req.user!.id } });
    await tx.cartItem.createMany({ data: data.cart.map((i) => ({ ...i, userId: req.user!.id })) });
    await tx.wishlist.createMany({
      data: data.wishlist.map((productId) => ({ productId, userId: req.user!.id })),
    });
  });
  res.json({ revision: data.revision + 1 });
});
