import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, hash, token } from '../core.js';
import { recordOrderCharge, voidReservationCharge } from './money-ledger.js';
export const orderSchema = z
  .object({
    items: z
      .array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(5) }))
      .min(1)
      .max(20),
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    phone: z.string().regex(/^\+?[0-9 -]{9,16}$/),
    fulfillment: z.enum(['PICKUP', 'DELIVERY']),
    address: z.object({
      province: z.string().max(50),
      district: z.string().max(80),
      municipality: z.string().max(100),
      ward: z.string().max(3),
      area: z.string().max(200),
      landmark: z.string().max(200),
    }),
    idempotencyKey: z.string().uuid(),
    tradeInId: z.string().optional(),
    termsAccepted: z.literal(true),
  })
  .superRefine((data, ctx) => {
    if (
      data.fulfillment === 'DELIVERY' &&
      (!data.address.province ||
        !data.address.district ||
        !data.address.municipality ||
        !data.address.ward ||
        !data.address.area)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Complete your delivery address.',
        path: ['address'],
      });
  });
export async function createOrder(data: z.infer<typeof orderSchema>, userId?: string) {
  const trackingToken = token();
  return db.$transaction(
    async (tx) => {
      const exists = await tx.order.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
      if (exists)
        throw new AppError(
          409,
          'ALREADY_SUBMITTED',
          'This checkout has already been submitted. Check your account or saved confirmation.',
        );
      const merged = new Map<string, number>();
      for (const item of data.items)
        merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
      const lines = [];
      let total = 0,
        dueNow = 0,
        preorder = false;
      for (const [variantId, quantity] of merged) {
        if (quantity > 5)
          throw new AppError(
            422,
            'QUANTITY_LIMIT',
            'A maximum of five of each configuration is allowed.',
          );
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true, stock: true },
        });
        if (!variant?.product.active)
          throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'This product is no longer available.');
        const stock = variant.stock.find((s) => s.available >= quantity);
        if (!stock)
          throw new AppError(
            409,
            'PRODUCT_OUT_OF_STOCK',
            'Selected configuration is unavailable. Choose another configuration.',
          );
        const reserved = await tx.inventoryStock.updateMany({
          where: { id: stock.id, available: { gte: quantity } },
          data: { available: { decrement: quantity }, reserved: { increment: quantity } },
        });
        if (reserved.count !== 1)
          throw new AppError(
            409,
            'PRODUCT_OUT_OF_STOCK',
            'This configuration just sold out. Choose another configuration.',
          );
        total += variant.price * quantity;
        dueNow += (variant.preorder ? variant.deposit : variant.price) * quantity;
        preorder ||= variant.preorder;
        lines.push({ variantId, quantity, unitPrice: variant.price, stockId: stock.id });
      }
      if (total > 2_000_000_000)
        throw new AppError(
          422,
          'ORDER_VALUE_LIMIT',
          'For an order of this size, contact the store for a quotation.',
        );
      if (data.tradeInId) {
        const quote = await tx.tradeIn.findFirst({
          where: { id: data.tradeInId, userId, status: 'ACCEPTED', order: null },
        });
        if (!userId || !quote?.finalValue)
          throw new AppError(
            409,
            'TRADE_IN_NOT_APPROVED',
            'Only an inspected, accepted trade-in can be applied at checkout.',
          );
        if (quote.finalValue > total)
          throw new AppError(
            409,
            'CREDIT_EXCEEDS_ORDER',
            'Choose items worth at least your inspected trade-in credit. Cash payouts are not available in checkout.',
          );
        total = total - quote.finalValue;
        dueNow = Math.min(dueNow, total);
      }
      const policy = await tx.cMSPage.findUnique({ where: { slug: 'prebooking-terms' } });
      const order = await tx.order.create({
        data: {
          policyAcceptance: {
            create: {
              policySlug: 'prebooking-terms',
              policyVersion: policy?.updatedAt.toISOString() ?? 'development-draft',
              policySnapshot: policy?.blocks ?? { notice: 'Development reservation terms' },
            },
          },
          number: `IB-${new Date().getFullYear()}-${token().slice(0, 8).toUpperCase()}`,
          userId,
          email: data.email,
          name: data.name,
          phone: data.phone,
          fulfillment: data.fulfillment,
          address: data.address,
          total,
          status: total === 0 ? 'PAID' : 'PLACED',
          dueNow,
          trackingHash: hash(trackingToken),
          idempotencyKey: data.idempotencyKey,
          tradeInId: data.tradeInId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          items: { create: lines },
          history: {
            create: {
              status: total === 0 ? 'PAID' : 'PLACED',
              note:
                total === 0
                  ? 'Accepted trade-in credit covers this order.'
                  : 'Reserved for 24 hours. Payment is due at the store.',
            },
          },
          ...(preorder
            ? {
                booking: {
                  create: { status: total === 0 ? 'AWAITING_ALLOCATION' : 'PENDING_PAYMENT' },
                },
              }
            : {}),
        },
        include: { items: true, booking: true },
      });
      await recordOrderCharge(tx, order);
      for (const line of lines)
        await tx.inventoryLedger.create({
          data: {
            stockId: line.stockId,
            type: 'RESERVATION',
            quantity: -line.quantity,
            reference: order.id,
          },
        });
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: total === 0 ? 'TRADE_IN' : 'STORE',
          amount: dueNow,
          status: total === 0 ? 'CONFIRMED' : 'PENDING',
        },
      });
      if (userId)
        await tx.notification.create({
          data: {
            userId,
            title: 'Your reservation is received',
            body: `${order.number} is reserved for 24 hours. No payment has been collected.`,
          },
        });
      return { ...order, trackingHash: undefined, trackingToken };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function expireReservations() {
  const expired = await db.order.findMany({
    where: { status: 'PLACED', expiresAt: { lt: new Date() } },
  });
  for (const order of expired)
    await db.$transaction(
      async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: 'PLACED' },
          data: { status: 'EXPIRED', tradeInId: null },
        });
        if (!claimed.count) return;
        await voidReservationCharge(tx, order);
        if (order.tradeInId)
          await tx.auditLog.create({
            data: {
              actorId: 'reservation-worker',
              action: 'tradein.credit.release',
              entity: 'Order',
              entityId: order.id,
              after: { tradeInId: order.tradeInId },
              requestId: order.id,
            },
          });
        for (const item of await tx.orderItem.findMany({ where: { orderId: order.id } })) {
          await tx.inventoryStock.update({
            where: { id: item.stockId },
            data: {
              reserved: { decrement: item.quantity },
              available: { increment: item.quantity },
            },
          });
          await tx.inventoryLedger.create({
            data: {
              stockId: item.stockId,
              type: 'RELEASE',
              quantity: item.quantity,
              reference: order.id,
            },
          });
        }
        await tx.payment.updateMany({
          where: { orderId: order.id, status: 'PENDING' },
          data: { status: 'EXPIRED' },
        });
        await tx.booking.updateMany({
          where: { orderId: order.id },
          data: { status: 'CANCELLED' },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'EXPIRED',
            note: 'Reservation expired before payment.',
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  return expired.length;
}
