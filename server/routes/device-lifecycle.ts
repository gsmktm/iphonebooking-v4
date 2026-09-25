import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, hash, owned, permit, requireUser } from '../core.js';
import { deviceRiskProvider } from '../services/device-risk.js';
import { deviceEvent } from '../services/device-lifecycle.js';

export const deviceLifecycle = Router();
deviceLifecycle.post('/admin/units', permit('inventory.adjust'), async (req, res) => {
  const data = z
    .object({
      variantId: z.string().min(1),
      serial: z.string().trim().min(6).max(40),
      stockId: z.string().optional(),
    })
    .strict()
    .parse(req.body);
  const result = await db.$transaction(
    async (tx) => {
      const stocks = await tx.inventoryStock.findMany({
        where: { variantId: data.variantId, ...(data.stockId ? { id: data.stockId } : {}) },
        take: 2,
      });
      if (stocks.length !== 1)
        throw new AppError(
          422,
          'STOCK_LOCATION_REQUIRED',
          'Select the stock location where this physical device was received.',
        );
      const stock = stocks[0];
      const count = await tx.inventoryUnit.count({
        where: { stockId: stock.id, status: { in: ['AVAILABLE', 'RESERVED'] } },
      });
      if (count >= stock.available + stock.reserved)
        throw new AppError(
          409,
          'RECEIPT_REQUIRED',
          'All received quantities already have serials. Record the inventory receipt first.',
        );
      const unit = await tx.inventoryUnit.create({
        data: {
          variantId: data.variantId,
          stockId: stock.id,
          serialHash: hash(data.serial),
          serialLast4: data.serial.slice(-4),
        },
      });
      const identity = await deviceEvent(tx, {
        unitId: unit.id,
        type: 'RECEIVED',
        key: `received:${unit.id}`,
        actor: { id: req.user!.id, requestId: req.requestId },
        reference: stock.id,
        location: stock.storeId,
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'inventory.serial.register',
          entity: 'InventoryUnit',
          entityId: unit.id,
          requestId: req.requestId,
          after: { stockId: stock.id, canonicalId: identity.canonicalId },
        },
      });
      return {
        id: unit.id,
        serialLast4: unit.serialLast4,
        status: unit.status,
        canonicalId: identity.canonicalId,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.status(201).json(result);
});

// The passport is a permission-filtered projection, never a separately edited copy.
deviceLifecycle.get('/account/devices/:id/passport', requireUser, async (req, res) => {
  const device = owned(
    await db.device.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
      include: {
        unit: {
          include: {
            variant: { include: { product: true } },
            stock: { include: { store: true } },
            identity: true,
          },
        },
        order: { select: { number: true } },
        repairs: {
          select: {
            id: true,
            issue: true,
            status: true,
            createdAt: true,
            repairWarranty: {
              select: { startDate: true, expiryDate: true, terms: true, status: true },
            },
          },
        },
        tradeIns: {
          select: { id: true, estimate: true, finalValue: true, status: true, createdAt: true },
        },
      },
    }),
  );
  const identity = device.unit.identity;
  const events = identity
    ? await db.deviceEvent.findMany({
        where: {
          deviceId: identity.id,
          customerVisible: true,
          OR: [
            { timestamp: { gte: device.createdAt } },
            { eventType: 'SOLD', reference: device.orderId },
          ],
        },
        select: { id: true, eventType: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
        take: 200,
      })
    : [];
  const accessories = await db.accessoryCompatibility.findMany({
    where: {
      deviceId: device.unit.variant.productId,
      accessory: { active: true, variants: { some: {} } },
    },
    select: { accessory: { select: { id: true, name: true, slug: true, image: true } } },
  });
  res.json({
    id: device.id,
    canonicalId: identity?.canonicalId ?? null,
    product: device.unit.variant.product.name,
    color: device.unit.variant.color,
    storage: device.unit.variant.storage,
    serial: `•••• ${device.unit.serialLast4}`,
    purchaseDate: device.createdAt,
    seller: device.unit.stock?.store.name ?? null,
    orderNumber: device.order.number,
    warrantyUntil: device.warrantyUntil,
    repairs: device.repairs,
    tradeIns: device.tradeIns,
    events,
    accessories: accessories.map((a) => a.accessory),
  });
});

deviceLifecycle.post(
  '/admin/device-identity/:id/risk-check',
  permit('device.inspect'),
  async (req, res) => {
    const identity = owned(
      await db.deviceIdentity.findUnique({
        where: { id: String(req.params.id) },
        select: { id: true, canonicalId: true },
      }),
    );
    const result = await deviceRiskProvider.check({ canonicalId: identity.canonicalId });
    const check = await db.$transaction(async (tx) => {
      const row = await tx.deviceRiskCheck.create({
        data: {
          deviceId: identity.id,
          checkType: 'EXTERNAL_REGISTRY',
          result: result.result,
          operator: req.user!.id,
          details: { provider: deviceRiskProvider.name, reason: result.reason },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'device.risk.check',
          entity: 'DeviceRiskCheck',
          entityId: row.id,
          requestId: req.requestId,
          after: { result: result.result, provider: deviceRiskProvider.name },
        },
      });
      return row;
    });
    res.status(201).json({ id: check.id, result: result.result, reason: result.reason });
  },
);
