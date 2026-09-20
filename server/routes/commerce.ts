import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, hash, owned } from '../core.js';
import { createOrder, orderSchema } from '../services/orders.js';
import { paymentProvider } from '../services/payments.js';
export const commerce = Router();
commerce.post('/orders', async (req, res) => {
  const data = orderSchema.parse(req.body);
  res.status(201).json(await createOrder(data, req.user?.id));
});
commerce.post('/tracking', async (req, res) => {
  const { number, receiptKey } = z
    .object({ number: z.string().max(80), receiptKey: z.string().min(32).max(128) })
    .parse(req.body);
  const order = owned(
    await db.order.findFirst({
      where: { number, trackingHash: hash(receiptKey) },
      select: { number: true, status: true, createdAt: true, history: true, booking: true },
    }),
  );
  res.json(order);
});
commerce.post('/payments', async (req, res) => {
  const { orderId } = z.object({ orderId: z.string() }).parse(req.body);
  const order = owned(
    await db.order.findFirst({ where: { id: orderId, userId: req.user?.id ?? 'unauthenticated' } }),
  );
  res.json(
    await paymentProvider.createPayment({
      orderId,
      amount: order.dueNow,
      currency: order.currency,
    }),
  );
});
commerce.post('/payments/webhook/:provider', () => {
  throw new AppError(
    503,
    'PROVIDER_NOT_CONFIGURED',
    'This payment provider has not been configured.',
  );
});
