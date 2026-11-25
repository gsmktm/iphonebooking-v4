import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, hash, owned } from '../core.js';
import { createOrder, orderSchema } from '../services/orders.js';
import {
  authorizedOrder,
  initiatePayment,
  verifyPayment,
  orderPayments,
} from '../services/payments.js';
import { khaltiConfig } from '../services/khalti.js';
import { checkoutQuote, quoteSchema } from '../services/checkout-quote.js';
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
  const data = z
    .object({
      orderId: z.string().max(100),
      receiptKey: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
      idempotencyKey: z.string().uuid().optional(),
    })
    .parse(req.body);
  const order = await authorizedOrder(data.orderId, req.user?.id, data.receiptKey);
  if (!khaltiConfig())
    throw new AppError(
      503,
      'PAYMENT_NOT_CONFIGURED',
      'Online payments are not enabled. Complete payment at the store.',
    );
  if (!data.idempotencyKey)
    throw new AppError(
      422,
      'PAYMENT_REFERENCE_REQUIRED',
      'Reload your payment screen and try again.',
    );
  res.json(await initiatePayment(order.id, data.idempotencyKey));
});
commerce.get('/payments/providers', (_req, res) =>
  res.json({ khalti: Boolean(khaltiConfig()), environment: khaltiConfig()?.environment ?? null }),
);
commerce.post('/payments/status', async (req, res) => {
  const data = z
    .object({
      orderId: z.string().max(100),
      receiptKey: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    })
    .parse(req.body);
  const order = await authorizedOrder(data.orderId, req.user?.id, data.receiptKey);
  res.json({ number: order.number, status: order.status, payments: await orderPayments(order) });
});
commerce.post('/payments/:id/verify', async (req, res) => {
  const data = z
    .object({
      receiptKey: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    })
    .parse(req.body);
  const payment = owned(await db.payment.findUnique({ where: { id: String(req.params.id) } }));
  await authorizedOrder(payment.orderId, req.user?.id, data.receiptKey);
  res.json(await verifyPayment(payment.id));
});
commerce.post('/checkout/quote', async (req, res) =>
  res.json(await checkoutQuote(quoteSchema.parse(req.body), req.user?.id)),
);
commerce.post('/payments/webhook/:provider', () => {
  throw new AppError(
    503,
    'PROVIDER_NOT_CONFIGURED',
    'This payment provider has not been configured.',
  );
});
