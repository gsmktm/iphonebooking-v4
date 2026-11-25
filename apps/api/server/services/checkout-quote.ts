import { z } from 'zod';
import { db } from '../db.js';
import { AppError, hash } from '../core.js';
export const quoteSchema = z.object({
  items: z
    .array(
      z.object({ variantId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(5) }),
    )
    .min(1)
    .max(20),
  tradeInId: z.string().max(100).optional(),
  fulfillment: z.enum(['PICKUP', 'DELIVERY']).default('PICKUP'),
});
export function quoteFingerprint(
  lines: { variantId: string; quantity: number; unitPrice: number }[],
  total: number,
  dueNow: number,
  fulfillment: string,
  tradeInId?: string,
) {
  return hash(
    JSON.stringify({
      lines: [...lines]
        .sort((a, b) => a.variantId.localeCompare(b.variantId))
        .map(({ variantId, quantity, unitPrice }) => ({ variantId, quantity, unitPrice })),
      total,
      dueNow,
      fulfillment,
      tradeInId: tradeInId ?? null,
    }),
  );
}
export async function checkoutQuote(data: z.infer<typeof quoteSchema>, userId?: string) {
  return db.$transaction(
    async (tx) => {
      const quantities = new Map<string, number>();
      for (const item of data.items)
        quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
      const lines = [];
      let subtotal = 0,
        dueNow = 0,
        credit = 0;
      for (const [variantId, quantity] of quantities) {
        if (quantity > 5)
          throw new AppError(
            422,
            'QUANTITY_LIMIT',
            'A maximum of five of each configuration is allowed.',
          );
        const v = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true, stock: true },
        });
        if (!v?.product.active || !v.stock.some((s) => s.available >= quantity))
          throw new AppError(
            409,
            'PRODUCT_UNAVAILABLE',
            'A selected configuration is unavailable. Update your bag before continuing.',
          );
        lines.push({
          variantId,
          quantity,
          unitPrice: v.price,
          name: v.product.name,
          storage: v.storage,
          color: v.color,
        });
        subtotal += v.price * quantity;
        dueNow += (v.preorder ? v.deposit : v.price) * quantity;
      }
      if (subtotal > 2_000_000_000)
        throw new AppError(
          422,
          'ORDER_VALUE_LIMIT',
          'Contact the store for an order of this size.',
        );
      if (data.tradeInId) {
        const trade = userId
          ? await tx.tradeIn.findFirst({
              where: { id: data.tradeInId, userId, status: 'ACCEPTED', order: null },
            })
          : null;
        if (!trade?.finalValue)
          throw new AppError(
            409,
            'TRADE_IN_NOT_APPROVED',
            'Select an accepted inspection offer from your account.',
          );
        credit = trade.finalValue;
        if (credit > subtotal)
          throw new AppError(
            409,
            'CREDIT_EXCEEDS_ORDER',
            'Your order must be worth at least your trade-in credit.',
          );
      }
      const total = subtotal - credit;
      dueNow = Math.min(dueNow, total);
      return {
        lines,
        currency: 'NPR',
        subtotal,
        credit,
        total,
        dueNow,
        fulfillment: data.fulfillment,
        shipping: data.fulfillment === 'DELIVERY' ? null : 0,
        shippingNote:
          data.fulfillment === 'DELIVERY'
            ? 'Delivery charges and timing require store confirmation. They are not included in this product reservation.'
            : 'Store pickup.',
        fingerprint: quoteFingerprint(lines, total, dueNow, data.fulfillment, data.tradeInId),
      };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
