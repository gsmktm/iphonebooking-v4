import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, requireUser } from '../core.js';
import { valueDevice } from '../services/valuation.js';
export const services = Router();
const valuationSchema = z.object({
  model: z.string().max(100),
  storage: z.string().max(30),
  condition: z.enum(['Excellent', 'Good', 'Fair', 'Damaged']),
  battery: z.number().int().min(0).max(100),
  functional: z.boolean(),
  deviceId: z.string().optional(),
  kind: z.enum(['TRADE_IN', 'EXCHANGE', 'BUYBACK']).default('TRADE_IN'),
});
services.get('/trade-in/rules', async (_req, res) =>
  res.json(
    await db.tradeInRule.findMany({ where: { active: true }, select: { model: true, id: true } }),
  ),
);
services.post('/trade-in/quote', async (req, res) => {
  const data = valuationSchema.parse(req.body);
  const rule = owned(
    await db.tradeInRule.findUnique({ where: { model: data.model, active: true } }),
  );
  res.json({
    estimate: valueDevice(rule, data.condition, data.battery, data.functional),
    currency: 'NPR',
    disclaimer: 'An estimate only. Final value follows physical inspection.',
  });
});
services.get('/trade-ins', requireUser, async (req, res) =>
  res.json(
    await db.tradeIn.findMany({
      where: { userId: req.user!.id },
      include: {
        tradeInQuotes: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            version: true,
            stage: true,
            previousValue: true,
            newValue: true,
            difference: true,
            reasonCodes: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ),
);
services.post('/trade-ins', requireUser, async (req, res) => {
  const data = valuationSchema.parse(req.body);
  const rule = owned(
    await db.tradeInRule.findUnique({ where: { model: data.model, active: true } }),
  );
  if (data.deviceId)
    owned(await db.device.findFirst({ where: { id: data.deviceId, userId: req.user!.id } }));
  res.status(201).json(
    await db.tradeIn.create({
      data: {
        userId: req.user!.id,
        deviceId: data.deviceId,
        kind: data.kind,
        model: data.model,
        storage: data.storage,
        condition: data.condition,
        answers: { battery: data.battery, functional: data.functional },
        estimate: valueDevice(rule, data.condition, data.battery, data.functional),
        tradeInQuotes: {
          create: {
            version: 'Q1',
            stage: 'CUSTOMER_ESTIMATE',
            newValue: valueDevice(rule, data.condition, data.battery, data.functional),
            reasonCodes: ['RULE_BASED_ESTIMATE'],
            evidenceIds: [],
            status: 'ESTIMATE',
          },
        },
      },
    }),
  );
});
services.post('/trade-ins/:id/decision', requireUser, async (req, res) => {
  const { accept } = z.object({ accept: z.boolean() }).parse(req.body);
  await db.$transaction(async (tx) => {
    const trade = owned(
      await tx.tradeIn.findFirst({
        where: { id: String(req.params.id), userId: req.user!.id },
        include: {
          tradeInQuotes: {
            where: { stage: 'FINAL_OFFER' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    );
    const result = await tx.tradeIn.updateMany({
      where: { id: trade.id, status: 'INSPECTED' },
      data: { status: accept ? 'ACCEPTED' : 'REJECTED' },
    });
    if (!result.count)
      throw new AppError(
        409,
        'QUOTE_NOT_READY',
        'There is no inspected quote awaiting your decision.',
      );
    const quote = trade.tradeInQuotes[0];
    if (quote)
      await tx.tradeInQuote.update({
        where: { id: quote.id },
        data: { status: accept ? 'ACCEPTED' : 'REJECTED' },
      });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'tradein.quote.decision',
        entity: 'TradeIn',
        entityId: trade.id,
        requestId: req.requestId,
        after: { accept, quoteId: quote?.id ?? null },
      },
    });
  });
  res.json({ ok: true });
});
services.get('/repairs', requireUser, async (req, res) =>
  res.json(
    await db.repair.findMany({
      where: { userId: req.user!.id },
      include: { history: true, quotes: true, repairWarranty: true },
      omit: { technician: true, assignedTechnicianId: true },
      orderBy: { createdAt: 'desc' },
    }),
  ),
);
services.get('/repairs/:id', requireUser, async (req, res) => {
  res.json(
    owned(
      await db.repair.findFirst({
        where: { id: String(req.params.id), userId: req.user!.id },
        include: {
          history: { orderBy: { createdAt: 'asc' } },
          quotes: { orderBy: { createdAt: 'desc' } },
          repairWarranty: true,
        },
        omit: { technician: true, assignedTechnicianId: true },
      }),
    ),
  );
});
services.post('/repairs', requireUser, async (req, res) => {
  const data = z
    .object({
      model: z.string().min(2).max(100),
      issue: z.string().min(2).max(80),
      description: z.string().min(10).max(2000),
      method: z.enum(['STORE', 'PICKUP']),
      appointment: z.string().datetime().optional(),
      deviceId: z.string().optional(),
    })
    .parse(req.body);
  if (data.deviceId)
    owned(await db.device.findFirst({ where: { id: data.deviceId, userId: req.user!.id } }));
  if (data.appointment && new Date(data.appointment) < new Date())
    throw new AppError(422, 'PAST_APPOINTMENT', 'Choose a future appointment time.');
  res.status(201).json(
    await db.repair.create({
      data: {
        ...data,
        userId: req.user!.id,
        history: {
          create: {
            status: 'REQUESTED',
            note: 'Service request received. We will confirm your appointment.',
          },
        },
      },
    }),
  );
});
services.post('/repairs/:id/quotes/:quoteId/decision', requireUser, async (req, res) => {
  const { accept } = z.object({ accept: z.boolean() }).parse(req.body);
  await db.$transaction(async (tx) => {
    const repair = owned(
      await tx.repair.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } }),
    );
    const quote = await tx.repairQuote.updateMany({
      where: { id: String(req.params.quoteId), repairId: repair.id, status: 'PENDING' },
      data: { status: accept ? 'APPROVED' : 'REJECTED', decidedAt: new Date() },
    });
    if (!quote.count)
      throw new AppError(
        409,
        'QUOTE_ALREADY_DECIDED',
        'This quote has already been decided. Refresh to see its latest status.',
      );
    const status = accept ? 'APPROVED' : 'REJECTED';
    await tx.repair.update({
      where: { id: repair.id },
      data: {
        status,
        history: {
          create: { status, note: `Customer ${accept ? 'approved' : 'rejected'} the quote.` },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'repair.quote.decision',
        entity: 'RepairQuote',
        entityId: String(req.params.quoteId),
        after: { accept },
        requestId: req.requestId,
      },
    });
  });
  res.json({ ok: true });
});
