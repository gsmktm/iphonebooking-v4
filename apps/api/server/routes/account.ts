import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, requireUser } from '../core.js';
export const account = Router();
account.use(requireUser);
account.get('/overview', async (req, res) => {
  const userId = req.user!.id;
  const [orders, devices, repairs, tradeIns, notifications] = await Promise.all([
    db.order.count({ where: { userId } }),
    db.device.count({ where: { userId } }),
    db.repair.count({ where: { userId } }),
    db.tradeIn.count({ where: { userId } }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  res.json({ orders, devices, repairs, tradeIns, notifications });
});
account.get('/orders', async (req, res) =>
  res.json(
    await db.order.findMany({
      where: { userId: req.user!.id },
      omit: { trackingHash: true, idempotencyKey: true },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        history: true,
        booking: true,
        payments: { include: { refunds: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ),
);
account.get('/devices', async (req, res) =>
  res.json(
    await db.device.findMany({
      where: { userId: req.user!.id },
      include: {
        unit: { select: { serialLast4: true, variant: { include: { product: true } } } },
        repairs: true,
        tradeIns: true,
      },
    }),
  ),
);
account.get('/notifications', async (req, res) =>
  res.json(
    await db.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    }),
  ),
);
account.patch('/notifications/:id', async (req, res) => {
  await db.notification.updateMany({
    where: { id: String(req.params.id), userId: req.user!.id },
    data: { read: true },
  });
  res.json({ ok: true });
});
account.get('/wishlist', async (req, res) =>
  res.json(
    await db.wishlist.findMany({
      where: { userId: req.user!.id },
      include: { product: { include: { category: true, variants: { include: { stock: true } } } } },
    }),
  ),
);
account.post('/wishlist', async (req, res) => {
  const { productId } = z.object({ productId: z.string().min(1) }).parse(req.body);
  const row = await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: req.user!.id }, data: { shopRevision: { increment: 1 } } });
    return tx.wishlist.upsert({
      where: { userId_productId: { userId: req.user!.id, productId } },
      create: { userId: req.user!.id, productId },
      update: {},
    });
  });
  res.json(row);
});
account.delete('/wishlist/:id', async (req, res) => {
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: req.user!.id }, data: { shopRevision: { increment: 1 } } });
    await tx.wishlist.deleteMany({
      where: { userId: req.user!.id, productId: String(req.params.id) },
    });
  });
  res.json({ ok: true });
});
account.get('/addresses', async (req, res) =>
  res.json(await db.address.findMany({ where: { userId: req.user!.id } })),
);
account.post('/addresses', async (req, res) => {
  const data = z
    .object({
      label: z.string().min(1).max(40),
      province: z.string().min(1).max(50),
      district: z.string().min(1).max(80),
      municipality: z.string().min(1).max(100),
      ward: z.string().min(1).max(3),
      area: z.string().min(1).max(200),
      landmark: z.string().max(200).optional(),
      phone: z.string().min(9).max(16),
    })
    .parse(req.body);
  res.status(201).json(await db.address.create({ data: { ...data, userId: req.user!.id } }));
});
account.get('/cart', async (req, res) =>
  res.json(await db.cartItem.findMany({ where: { userId: req.user!.id } })),
);
account.put('/cart', async (req, res) => {
  const { items } = z
    .object({
      items: z
        .array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(5) }))
        .max(20),
    })
    .parse(req.body);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: req.user!.id }, data: { shopRevision: { increment: 1 } } });
    await tx.cartItem.deleteMany({ where: { userId: req.user!.id } });
    await tx.cartItem.createMany({ data: items.map((i) => ({ ...i, userId: req.user!.id })) });
  });
  res.json({ ok: true });
});
account.get('/tickets', async (req, res) =>
  res.json(
    await db.supportTicket.findMany({
      where: { userId: req.user!.id },
      include: { messages: { where: { internal: false } } },
      orderBy: { createdAt: 'desc' },
    }),
  ),
);
account.post('/tickets', async (req, res) => {
  const data = z
    .object({ subject: z.string().min(3).max(150), message: z.string().min(10).max(4000) })
    .parse(req.body);
  res.status(201).json(
    await db.supportTicket.create({
      data: {
        subject: data.subject,
        userId: req.user!.id,
        messages: { create: { body: data.message } },
      },
    }),
  );
});
account.post('/tickets/:id/messages', async (req, res) => {
  const { body } = z.object({ body: z.string().min(1).max(4000) }).parse(req.body);
  const ticket = owned(
    await db.supportTicket.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    }),
  );
  res.status(201).json(await db.ticketMessage.create({ data: { ticketId: ticket.id, body } }));
});
account.post('/refunds', async (req, res) => {
  const { paymentId, reason } = z
    .object({ paymentId: z.string(), reason: z.string().min(10).max(1000) })
    .parse(req.body);
  const payment = owned(
    await db.payment.findFirst({
      where: { id: paymentId, order: { userId: req.user!.id } },
      include: { refunds: true },
    }),
  );
  if (payment.status !== 'CONFIRMED' || payment.refunds.length)
    throw new AppError(
      409,
      'REFUND_UNAVAILABLE',
      'This payment is not eligible for a new refund request.',
    );
  res
    .status(201)
    .json(await db.refund.create({ data: { paymentId, reason, amount: payment.amount } }));
});
account.patch('/profile', async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(100) }).parse(req.body);
  await db.user.update({ where: { id: req.user!.id }, data: { name } });
  res.json({ ok: true });
});
