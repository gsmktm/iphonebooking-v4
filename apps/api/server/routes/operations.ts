import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, permit } from '../core.js';
import { deviceEvent, serviceEvent, verifyUnitLocation } from '../services/device-lifecycle.js';
import { requireRepairQC, issueRepairWarranty } from '../services/repair-quality.js';
import { recordStorePayment } from '../services/money-ledger.js';
export const operations = Router();
operations.post('/orders/:id/collect', permit('payment.collect'), async (req, res) => {
  const { amount, reference } = z
    .object({
      amount: z.number().int().positive().max(1000000000),
      reference: z.string().min(5).max(80),
    })
    .parse(req.body);
  await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${String(req.params.id)} FOR UPDATE`;
      const order = owned(
        await tx.order.findUnique({
          where: { id: String(req.params.id) },
          include: { payments: true },
        }),
      );
      if (['EXPIRED', 'CANCELLED', 'DELIVERED'].includes(order.status))
        throw new AppError(409, 'ORDER_CLOSED', 'This reservation is no longer open.');
      if (order.status === 'PLACED' && order.expiresAt <= new Date())
        throw new AppError(
          409,
          'RESERVATION_EXPIRED',
          'This reservation has expired. Create a new reservation before collecting payment.',
        );
      const paid = order.payments
        .filter((p) => p.status === 'CONFIRMED')
        .reduce((sum, p) => sum + p.amount, 0);
      if (
        order.payments.some(
          (p) =>
            p.provider === 'KHALTI' &&
            [
              'INITIALIZING',
              'INITIALIZATION_UNCERTAIN',
              'PENDING',
              'VERIFICATION_PENDING',
              'REVIEW_REQUIRED',
            ].includes(p.status),
        )
      )
        throw new AppError(
          409,
          'ONLINE_PAYMENT_PENDING',
          'Verify the open online payment before collecting another payment.',
        );
      if (amount > order.total - paid)
        throw new AppError(409, 'OVERPAYMENT', 'The amount exceeds the remaining balance.');
      await tx.payment.updateMany({
        where: { orderId: order.id, status: 'PENDING', provider: 'STORE' },
        data: { status: 'SUPERSEDED' },
      });
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'STORE',
          externalId: `store:${reference}`,
          amount,
          status: 'CONFIRMED',
        },
      });
      await recordStorePayment(tx, payment);
      const status = paid + amount >= order.total ? 'PAID' : 'DEPOSIT_PAID';
      await tx.order.update({
        where: { id: order.id },
        data: {
          status,
          history: { create: { status, note: 'Payment recorded by store finance staff.' } },
        },
      });
      await tx.booking.updateMany({
        where: { orderId: order.id },
        data: { status: 'AWAITING_ALLOCATION' },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'payment.collect',
          entity: 'Order',
          entityId: order.id,
          after: { amount, reference },
          requestId: req.requestId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.json({ ok: true });
});
operations.post('/orders/:id/fulfill', permit('order.fulfill'), async (req, res) => {
  const { unitIds } = z.object({ unitIds: z.array(z.string()).min(1).max(100) }).parse(req.body);
  await db.$transaction(
    async (tx) => {
      const order = owned(
        await tx.order.findUnique({
          where: { id: String(req.params.id) },
          include: { items: true, allocations: true },
        }),
      );
      if (
        !['PAID', 'PROCESSING', 'READY_FOR_DISPATCH', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(
          order.status,
        )
      )
        throw new AppError(409, 'PAYMENT_REQUIRED', 'Full payment is required before fulfillment.');
      if (
        order.allocations.length &&
        (order.allocations.length !== unitIds.length ||
          order.allocations.some((a) => !unitIds.includes(a.unitId)))
      )
        throw new AppError(
          409,
          'ALLOCATION_MISMATCH',
          'Fulfillment must use the physical units already allocated to this order.',
        );
      if (!order.userId)
        throw new AppError(
          409,
          'OWNERSHIP_REQUIRED',
          'Ask the customer to claim this order in their account before device handover.',
        );
      const units = await tx.inventoryUnit.findMany({
        where: {
          id: { in: unitIds },
          OR: [
            { status: 'AVAILABLE', allocation: null },
            { status: 'RESERVED', allocation: { orderId: order.id } },
          ],
        },
      });
      if (
        units.length !== unitIds.length ||
        order.items.reduce((s, i) => s + i.quantity, 0) !== units.length
      )
        throw new AppError(
          409,
          'ALLOCATION_INVALID',
          'Select one available physical unit for each ordered item.',
        );
      for (const item of order.items) {
        if (units.filter((u) => u.variantId === item.variantId).length !== item.quantity)
          throw new AppError(
            409,
            'VARIANT_MISMATCH',
            'A selected serial belongs to a different configuration.',
          );
        await tx.inventoryStock.update({
          where: { id: item.stockId },
          data: { reserved: { decrement: item.quantity } },
        });
        await tx.inventoryLedger.create({
          data: { stockId: item.stockId, type: 'SALE', quantity: 0, reference: order.id },
        });
      }
      for (const unit of units) {
        const item = order.items.find((item) => item.variantId === unit.variantId)!;
        const stock = await verifyUnitLocation(tx, unit, item.stockId);
        await tx.bookingAllocation.upsert({
          where: { unitId: unit.id },
          create: { orderId: order.id, unitId: unit.id },
          update: {},
        });
        await tx.inventoryUnit.update({ where: { id: unit.id }, data: { status: 'SOLD' } });
        await deviceEvent(tx, {
          unitId: unit.id,
          type: 'SOLD',
          key: `sold:${order.id}:${unit.id}`,
          actor: { id: req.user!.id, requestId: req.requestId },
          reference: order.id,
          location: stock.storeId,
          visible: true,
          status: 'SOLD',
        });
        await tx.device.create({
          data: {
            unitId: unit.id,
            orderId: order.id,
            userId: order.userId,
            warrantyUntil: new Date(Date.now() + 365 * 86400000),
          },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERED',
          history: {
            create: { status: 'DELIVERED', note: 'Device handed over and linked to your account.' },
          },
        },
      });
      await tx.booking.updateMany({ where: { orderId: order.id }, data: { status: 'DELIVERED' } });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'order.fulfill',
          entity: 'Order',
          entityId: order.id,
          after: { unitIds },
          requestId: req.requestId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.json({ ok: true });
});
const transitions: Record<string, string[]> = {
  REQUESTED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['INSPECTION'],
  INSPECTION: ['DIAGNOSIS', 'UNREPAIRABLE'],
  DIAGNOSIS: ['WAITING_CUSTOMER_APPROVAL'],
  APPROVED: ['PARTS_REQUIRED', 'REPAIR_IN_PROGRESS'],
  PARTS_REQUIRED: ['REPAIR_IN_PROGRESS'],
  REPAIR_IN_PROGRESS: ['QUALITY_CONTROL'],
  QUALITY_CONTROL: ['READY', 'REPAIR_IN_PROGRESS'],
  READY: ['COMPLETED', 'OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['COMPLETED'],
};
operations.patch('/repairs/:id/status', permit('repair.update'), async (req, res) => {
  const data = z
    .object({
      status: z.string(),
      note: z.string().min(3).max(1000),
    })
    .strict()
    .parse(req.body);
  await db.$transaction(
    async (tx) => {
      const repair = owned(await tx.repair.findUnique({ where: { id: String(req.params.id) } }));
      if (!transitions[repair.status]?.includes(data.status))
        throw new AppError(
          409,
          'INVALID_TRANSITION',
          `Cannot move ${repair.status} to ${data.status}.`,
        );
      if (data.status === 'READY') await requireRepairQC(tx, repair.id);
      if (data.status === 'COMPLETED') await issueRepairWarranty(tx, repair.id);
      const changed = await tx.repair.updateMany({
        where: { id: repair.id, status: repair.status },
        data: { status: data.status },
      });
      if (!changed.count)
        throw new AppError(
          409,
          'STATUS_CHANGED',
          'Another staff member updated this repair. Refresh and retry.',
        );
      await tx.repair.update({
        where: { id: repair.id },
        data: {
          status: data.status,
          history: { create: { status: data.status, note: data.note } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'repair.status',
          entity: 'Repair',
          entityId: repair.id,
          after: data,
          requestId: req.requestId,
        },
      });
      await serviceEvent(tx, {
        deviceId: repair.deviceId,
        type: `REPAIR_${data.status}`,
        key: `repair:${repair.id}:${req.requestId}`,
        actor: { id: req.user!.id, requestId: req.requestId },
        reference: repair.id,
      });
      await tx.notification.create({
        data: { userId: repair.userId, title: 'Repair update', body: data.note },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.json({ ok: true });
});
operations.post('/repairs/:id/quote', permit('repair.update'), async (req, res) => {
  const data = z
    .object({
      diagnosis: z.string().min(10).max(3000),
      parts: z.number().int().min(0).max(100000000),
      labor: z.number().int().min(0).max(10000000),
      warrantyDays: z.number().int().min(0).max(730),
    })
    .parse(req.body);
  res.status(201).json(
    await db.$transaction(async (tx) => {
      const repair = owned(
        await tx.repair.findUnique({
          where: { id: String(req.params.id) },
          include: { quotes: true },
        }),
      );
      if (
        repair.quotes.some((q) => q.status === 'PENDING') ||
        !['DIAGNOSIS', 'REJECTED'].includes(repair.status)
      )
        throw new AppError(
          409,
          'QUOTE_NOT_ALLOWED',
          'Complete diagnosis first and resolve existing quotes.',
        );
      const quote = await tx.repairQuote.create({
        data: { ...data, repairId: repair.id, total: data.parts + data.labor },
      });
      await tx.repair.update({
        where: { id: repair.id },
        data: {
          status: 'WAITING_CUSTOMER_APPROVAL',
          history: {
            create: {
              status: 'WAITING_CUSTOMER_APPROVAL',
              note: 'Your repair quote is ready for review.',
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'repair.quote.create',
          entity: 'RepairQuote',
          entityId: quote.id,
          requestId: req.requestId,
          after: data,
        },
      });
      return quote;
    }),
  );
});
operations.patch('/trade-ins/:id/inspect', permit('tradein.update'), async (req, res) => {
  const data = z
    .object({
      finalValue: z.number().int().min(0).max(100000000),
      reason: z.string().trim().min(10).max(1000),
    })
    .strict()
    .parse(req.body);
  await db.$transaction(async (tx) => {
    const trade = owned(await tx.tradeIn.findUnique({ where: { id: String(req.params.id) } }));
    const result = await tx.tradeIn.updateMany({
      where: { id: trade.id, status: 'SUBMITTED' },
      data: { finalValue: data.finalValue, status: 'INSPECTED' },
    });
    if (!result.count)
      throw new AppError(409, 'ALREADY_INSPECTED', 'This request is not awaiting inspection.');
    await tx.tradeInQuote.create({
      data: {
        tradeInId: trade.id,
        version: 'Q2',
        stage: 'FINAL_OFFER',
        previousValue: trade.estimate,
        newValue: data.finalValue,
        difference: data.finalValue - trade.estimate,
        reasonCodes: [data.reason],
        evidenceIds: [],
        approver: req.user!.id,
        approvedAt: new Date(),
        status: 'OFFERED',
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'tradein.inspect',
        entity: 'TradeIn',
        entityId: trade.id,
        after: data,
        requestId: req.requestId,
      },
    });
    await serviceEvent(tx, {
      deviceId: trade.deviceId,
      type: 'TRADEIN_INSPECTED',
      key: `tradein-inspected:${trade.id}`,
      actor: { id: req.user!.id, requestId: req.requestId },
      reference: trade.id,
    });
  });
  res.json({ ok: true });
});
operations.post('/tickets/:id/messages', permit('support.update'), async (req, res) => {
  const data = z
    .object({ body: z.string().min(1).max(4000), internal: z.boolean() })
    .parse(req.body);
  res.status(201).json(
    await db.ticketMessage.create({
      data: { ...data, ticketId: String(req.params.id), staff: true },
    }),
  );
});
operations.post('/orders/:id/allocate', permit('order.fulfill'), async (req, res) => {
  const { unitIds } = z.object({ unitIds: z.array(z.string()).min(1).max(100) }).parse(req.body);
  await db.$transaction(
    async (tx) => {
      const order = owned(
        await tx.order.findUnique({
          where: { id: String(req.params.id) },
          include: { items: true, allocations: true },
        }),
      );
      if (!['PAID', 'DEPOSIT_PAID'].includes(order.status))
        throw new AppError(
          409,
          'PAYMENT_REQUIRED',
          'A verified deposit or full payment is required before allocation.',
        );
      if (order.allocations.length)
        throw new AppError(
          409,
          'ALREADY_ALLOCATED',
          'Physical units have already been allocated to this order.',
        );
      const units = await tx.inventoryUnit.findMany({
        where: { id: { in: unitIds }, status: 'AVAILABLE' },
      });
      if (
        units.length !== unitIds.length ||
        new Set(unitIds).size !== unitIds.length ||
        order.items.reduce((s, i) => s + i.quantity, 0) !== units.length
      )
        throw new AppError(
          409,
          'ALLOCATION_INVALID',
          'Select one available physical unit for each ordered item.',
        );
      for (const item of order.items)
        if (units.filter((u) => u.variantId === item.variantId).length !== item.quantity)
          throw new AppError(
            409,
            'VARIANT_MISMATCH',
            'An allocated device belongs to a different configuration.',
          );
      for (const unit of units) {
        const item = order.items.find((item) => item.variantId === unit.variantId)!;
        const stock = await verifyUnitLocation(tx, unit, item.stockId);
        await tx.inventoryUnit.update({ where: { id: unit.id }, data: { status: 'RESERVED' } });
        await deviceEvent(tx, {
          unitId: unit.id,
          type: 'BOOKED',
          key: `allocated:${order.id}:${unit.id}`,
          actor: { id: req.user!.id, requestId: req.requestId },
          reference: order.id,
          location: stock.storeId,
          status: 'RESERVED',
        });
        await tx.bookingAllocation.create({ data: { orderId: order.id, unitId: unit.id } });
      }
      await tx.booking.updateMany({ where: { orderId: order.id }, data: { status: 'ALLOCATED' } });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'ALLOCATED',
          note: 'Your physical device has been allocated.',
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'booking.allocate',
          entity: 'Order',
          entityId: order.id,
          after: { unitIds },
          requestId: req.requestId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.json({ ok: true });
});
operations.patch('/orders/:id/status', permit('order.fulfill'), async (req, res) => {
  const { status, note } = z
    .object({
      status: z.enum(['PROCESSING', 'READY_FOR_DISPATCH', 'SHIPPED', 'OUT_FOR_DELIVERY']),
      note: z.string().min(3).max(500),
    })
    .parse(req.body);
  const sequence: Record<string, string> = {
    PAID: 'PROCESSING',
    PROCESSING: 'READY_FOR_DISPATCH',
    READY_FOR_DISPATCH: 'SHIPPED',
    SHIPPED: 'OUT_FOR_DELIVERY',
  };
  await db.$transaction(async (tx) => {
    const order = owned(await tx.order.findUnique({ where: { id: String(req.params.id) } }));
    if (sequence[order.status] !== status)
      throw new AppError(409, 'INVALID_TRANSITION', `Cannot move ${order.status} to ${status}.`);
    const changed = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status },
    });
    if (!changed.count)
      throw new AppError(
        409,
        'STATUS_CHANGED',
        'The order was updated by another staff member. Refresh and retry.',
      );
    await tx.orderStatusHistory.create({ data: { orderId: order.id, status, note } });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'order.status',
        entity: 'Order',
        entityId: order.id,
        after: { status, note },
        requestId: req.requestId,
      },
    });
  });
  res.json({ ok: true });
});
