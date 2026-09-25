import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { permit } from '../core.js';
export const finance = Router();
finance.get('/reconciliation', permit('payment.view'), async (req, res) => {
  const { page } = z
    .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
    .parse(req.query);
  const take = 50;
  const { orders, total, entries } = await db.$transaction(
    async (tx) => {
      const [orders, total] = await Promise.all([
        tx.order.findMany({
          orderBy: { createdAt: 'desc' },
          take,
          skip: (page - 1) * take,
          select: {
            id: true,
            number: true,
            total: true,
            status: true,
            payments: { where: { status: 'CONFIRMED' }, select: { amount: true } },
          },
        }),
        tx.order.count(),
      ]);
      const entries = await tx.orderMoneyEntry.groupBy({
        by: ['orderId'],
        where: { orderId: { in: orders.map((o) => o.id) } },
        _sum: { amount: true },
        _count: true,
      });
      return { orders, total, entries };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  const rows = orders.map((order) => {
    const paid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const entry = entries.find((e) => e.orderId === order.id);
    const recordedBalance = entry?._sum.amount ?? null;
    const expectedBalance = order.status === 'EXPIRED' ? 0 : order.total - paid;
    const flags: string[] = [];
    if (recordedBalance === null) flags.push('LEDGER_MISSING');
    else if (recordedBalance !== expectedBalance) flags.push('BALANCE_MISMATCH');
    if (paid > order.total) flags.push('OVERPAYMENT');
    if (
      [
        'PAID',
        'PROCESSING',
        'READY_FOR_DISPATCH',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
      ].includes(order.status) &&
      paid < order.total
    )
      flags.push('PAYMENT_MISSING');
    if (order.status === 'EXPIRED' && paid > 0) flags.push('PAYMENT_ON_EXPIRED_ORDER');
    return {
      id: order.id,
      number: order.number,
      status: flags.length ? 'REVIEW' : 'MATCHED',
      orderStatus: order.status,
      expectedBalance,
      recordedBalance,
      confirmedPayments: paid,
      flags,
    };
  });
  res.json({ rows, total, page, pageSize: take });
});
