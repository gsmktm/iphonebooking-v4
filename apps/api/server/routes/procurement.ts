import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, hash, owned, permit, token } from '../core.js';
import { deviceEvent } from '../services/device-lifecycle.js';
export const procurement = Router();
const paisa = z.number().int().min(0).max(100000000);
const linesSchema = z
  .array(
    z
      .object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(1000),
        unitCost: paisa,
      })
      .strict(),
  )
  .min(1)
  .max(100);
procurement.post('/suppliers', permit('procurement.create'), async (req, res) => {
  const data = z
    .object({
      name: z.string().min(2).max(150),
      email: z.string().email().optional(),
      phone: z.string().max(30).optional(),
      contact: z.string().max(100).optional(),
    })
    .strict()
    .parse(req.body);
  const supplier = await db.$transaction(async (tx) => {
    const row = await tx.partSupplier.create({ data });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'supplier.create',
        entity: 'PartSupplier',
        entityId: row.id,
        requestId: req.requestId,
        after: data,
      },
    });
    return row;
  });
  res.status(201).json(supplier);
});
procurement.post('/purchase-orders', permit('procurement.create'), async (req, res) => {
  const data = z
    .object({
      supplierId: z.string(),
      items: linesSchema,
      tax: paisa.default(0),
      freight: paisa.default(0),
      invoiceRef: z.string().max(100).optional(),
    })
    .strict()
    .parse(req.body);
  if (new Set(data.items.map((i) => i.variantId)).size !== data.items.length)
    throw new AppError(422, 'DUPLICATE_LINE', 'Use one purchase-order line per configuration.');
  const cost = data.items.reduce((sum, line) => sum + line.unitCost * line.quantity, 0);
  if (cost + data.tax + data.freight > 2000000000)
    throw new AppError(422, 'VALUE_LIMIT', 'Split this purchase into smaller approved orders.');
  const quantity = data.items.reduce((sum, line) => sum + line.quantity, 0);
  const po = await db.$transaction(async (tx) => {
    owned(await tx.partSupplier.findFirst({ where: { id: data.supplierId, active: true } }));
    const variants = await tx.productVariant.count({
      where: { id: { in: data.items.map((i) => i.variantId) } },
    });
    if (variants !== data.items.length)
      throw new AppError(
        422,
        'INVALID_CONFIGURATION',
        'Every purchase line must reference an existing configuration.',
      );
    const row = await tx.purchaseOrder.create({
      data: {
        poNumber: `PO-${token().slice(0, 12).toUpperCase()}`,
        supplierId: data.supplierId,
        items: data.items,
        costNPR: cost,
        taxNPR: data.tax,
        freightNPR: data.freight,
        orderedQty: quantity,
        pendingQty: quantity,
        invoiceRef: data.invoiceRef,
        createdBy: req.user!.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'procurement.create',
        entity: 'PurchaseOrder',
        entityId: row.id,
        requestId: req.requestId,
        after: data,
      },
    });
    return row;
  });
  res.status(201).json(po);
});
procurement.post(
  '/purchase-orders/:id/approve',
  permit('procurement.approve'),
  async (req, res) => {
    const { reason } = z
      .object({ reason: z.string().trim().min(10).max(500) })
      .strict()
      .parse(req.body);
    await db.$transaction(async (tx) => {
      const po = owned(await tx.purchaseOrder.findUnique({ where: { id: String(req.params.id) } }));
      if (!po.createdBy || po.createdBy === req.user!.id)
        throw new AppError(
          409,
          'INDEPENDENT_APPROVER_REQUIRED',
          'A different authorized staff member must approve this purchase. Legacy drafts need provenance review.',
        );
      const changed = await tx.purchaseOrder.updateMany({
        where: { id: po.id, status: 'CREATED' },
        data: { status: 'APPROVED', approvedBy: req.user!.id },
      });
      if (!changed.count)
        throw new AppError(
          409,
          'ORDER_ALREADY_DECIDED',
          'This purchase is no longer awaiting approval.',
        );
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'procurement.approve',
          entity: 'PurchaseOrder',
          entityId: po.id,
          requestId: req.requestId,
          after: { reason },
        },
      });
    });
    res.json({ ok: true });
  },
);
procurement.post('/purchase-orders/:id/receive', permit('inventory.receive'), async (req, res) => {
  const data = z
    .object({
      reference: z.string().trim().min(5).max(80),
      storeId: z.string(),
      units: z
        .array(
          z.object({ variantId: z.string(), serial: z.string().trim().min(6).max(40) }).strict(),
        )
        .min(1)
        .max(100),
    })
    .strict()
    .parse(req.body);
  const grn = await db.$transaction(
    async (tx) => {
      const po = owned(await tx.purchaseOrder.findUnique({ where: { id: String(req.params.id) } }));
      if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status))
        throw new AppError(
          409,
          'PURCHASE_NOT_APPROVED',
          'Approve the purchase before receiving devices.',
        );
      owned(await tx.store.findUnique({ where: { id: data.storeId } }));
      const items = linesSchema.parse(po.items);
      for (const variantId of new Set(data.units.map((u) => u.variantId))) {
        const line = items.find((i) => i.variantId === variantId);
        const received = await tx.inventoryUnit.count({
          where: { variantId, grn: { poId: po.id } },
        });
        if (
          !line ||
          received + data.units.filter((u) => u.variantId === variantId).length > line.quantity
        )
          throw new AppError(
            409,
            'PURCHASE_QUANTITY_MISMATCH',
            'Received configurations or quantities exceed the approved purchase.',
          );
      }
      const row = await tx.goodsReceivedNote.create({
        data: {
          poId: po.id,
          grnNumber: data.reference,
          receivedBy: req.user!.id,
          status: 'AWAITING_QC',
        },
      });
      for (const incoming of data.units) {
        const stock = await tx.inventoryStock.upsert({
          where: { variantId_storeId: { variantId: incoming.variantId, storeId: data.storeId } },
          update: {},
          create: { variantId: incoming.variantId, storeId: data.storeId },
        });
        const line = items.find((i) => i.variantId === incoming.variantId)!;
        const unit = await tx.inventoryUnit.create({
          data: {
            variantId: incoming.variantId,
            serialHash: hash(incoming.serial),
            serialLast4: incoming.serial.slice(-4),
            stockId: stock.id,
            grnId: row.id,
            cost: line.unitCost,
            status: 'QC_PENDING',
          },
        });
        const identity = await deviceEvent(tx, {
          unitId: unit.id,
          type: 'RECEIVED',
          key: `received:${unit.id}`,
          actor: { id: req.user!.id, requestId: req.requestId },
          reference: row.id,
          location: data.storeId,
          metadata: { purchaseOrder: po.id, supplier: po.supplierId },
        });
        await tx.deviceProvenance.create({
          data: {
            deviceId: identity.id,
            supplier: po.supplierId,
            purchaseOrder: po.id,
            invoiceRef: po.invoiceRef,
            receivedDate: new Date(),
            warehouse: data.storeId,
            inventoryClass: 'NEW',
          },
        });
      }
      const receivedQty = po.receivedQty + data.units.length;
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          receivedQty,
          pendingQty: po.orderedQty - receivedQty,
          status: receivedQty === po.orderedQty ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'procurement.receive',
          entity: 'GoodsReceivedNote',
          entityId: row.id,
          requestId: req.requestId,
          after: { purchaseOrder: po.id, count: data.units.length, storeId: data.storeId },
        },
      });
      return row;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.status(201).json(grn);
});
procurement.post('/receipts/:id/qc', permit('inventory.qc'), async (req, res) => {
  const data = z
    .object({ passed: z.boolean(), notes: z.string().trim().min(10).max(1000) })
    .strict()
    .parse(req.body);
  await db.$transaction(
    async (tx) => {
      const grn = owned(
        await tx.goodsReceivedNote.findUnique({
          where: { id: String(req.params.id) },
          include: { units: true },
        }),
      );
      if (
        grn.status !== 'AWAITING_QC' ||
        !grn.units.length ||
        grn.units.some((u) => u.status !== 'QC_PENDING')
      )
        throw new AppError(
          409,
          'RECEIPT_ALREADY_INSPECTED',
          'This receipt is not awaiting a QC decision.',
        );
      if (
        process.env.REQUIRE_INDEPENDENT_RECEIVING_QC === 'true' &&
        grn.receivedBy === req.user!.id
      )
        throw new AppError(
          409,
          'INDEPENDENT_QC_REQUIRED',
          'Another authorized staff member must inspect this receipt.',
        );
      const status = data.passed ? 'AVAILABLE' : 'QUARANTINED';
      for (const unit of grn.units) {
        if (!unit.stockId)
          throw new AppError(
            409,
            'LOCATION_REQUIRED',
            'Reconcile this device location before inspecting it.',
          );
        await tx.inventoryUnit.update({ where: { id: unit.id }, data: { status } });
        if (data.passed) {
          await tx.inventoryStock.update({
            where: { id: unit.stockId },
            data: { available: { increment: 1 } },
          });
          await tx.inventoryLedger.create({
            data: {
              stockId: unit.stockId,
              type: 'PURCHASE_IN',
              quantity: 1,
              reference: `grn:${grn.id}:${unit.id}`,
            },
          });
        }
        await deviceEvent(tx, {
          unitId: unit.id,
          type: data.passed ? 'QC_PASSED' : 'QC_REJECTED',
          key: `receiving-qc:${unit.id}`,
          actor: { id: req.user!.id, requestId: req.requestId },
          reference: grn.id,
          status,
          metadata: { notes: data.notes },
        });
      }
      await tx.goodsReceivedNote.update({
        where: { id: grn.id },
        data: {
          status: data.passed ? 'ACCEPTED' : 'QUARANTINED',
          damageFound: !data.passed,
          discrepancy: { notes: data.notes },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'procurement.qc',
          entity: 'GoodsReceivedNote',
          entityId: grn.id,
          requestId: req.requestId,
          after: data,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.json({ ok: true });
});
