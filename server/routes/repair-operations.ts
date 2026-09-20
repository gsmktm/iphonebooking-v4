import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, permit } from '../core.js';
import { qcChecks } from '../services/repair-quality.js';
import { serviceEvent } from '../services/device-lifecycle.js';
export const repairOperations = Router();
const cost = z.number().int().min(0).max(100000000);
repairOperations.post('/parts', permit('inventory.adjust'), async (req, res) => {
  const data = z
    .object({
      sku: z.string().trim().min(2).max(80),
      name: z.string().min(2).max(120),
      cost,
      binLocation: z.string().max(100).optional(),
      productIds: z.array(z.string()).min(1).max(100),
    })
    .strict()
    .parse(req.body);
  const row = await db.$transaction(async (tx) => {
    const { productIds, ...fields } = data;
    const part = await tx.part.create({
      data: {
        ...fields,
        compatibilities: { create: [...new Set(productIds)].map((deviceId) => ({ deviceId })) },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'part.create',
        entity: 'Part',
        entityId: part.id,
        requestId: req.requestId,
        after: data,
      },
    });
    return part;
  });
  res.status(201).json(row);
});
repairOperations.post('/parts/:id/receive', permit('inventory.adjust'), async (req, res) => {
  const data = z
    .object({
      quantity: z.number().int().min(1).max(10000),
      unitCost: cost,
      reference: z.string().min(5).max(100),
    })
    .strict()
    .parse(req.body);
  await db.$transaction(async (tx) => {
    const part = owned(
      await tx.part.findFirst({ where: { id: String(req.params.id), active: true } }),
    );
    await tx.partMovement.create({
      data: { ...data, partId: part.id, type: 'RECEIPT', actorId: req.user!.id },
    });
    await tx.part.update({
      where: { id: part.id },
      data: { stock: { increment: data.quantity }, cost: data.unitCost },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'part.receive',
        entity: 'Part',
        entityId: part.id,
        requestId: req.requestId,
        after: data,
      },
    });
  });
  res.status(201).json({ ok: true });
});
repairOperations.post('/repairs/:id/parts', permit('repair.update'), async (req, res) => {
  const data = z
    .object({
      partId: z.string(),
      quantity: z.number().int().min(1).max(20),
      reference: z.string().min(5).max(100),
    })
    .strict()
    .parse(req.body);
  await db.$transaction(
    async (tx) => {
      const repair = owned(
        await tx.repair.findUnique({
          where: { id: String(req.params.id) },
          include: { device: { include: { unit: { include: { variant: true } } } } },
        }),
      );
      if (!['APPROVED', 'PARTS_REQUIRED', 'REPAIR_IN_PROGRESS'].includes(repair.status))
        throw new AppError(
          409,
          'REPAIR_NOT_APPROVED',
          'Parts can only be consumed for an approved, active repair.',
        );
      if (!repair.device)
        throw new AppError(
          409,
          'DEVICE_LINK_REQUIRED',
          'Link a verified device before consuming a compatible part.',
        );
      const part = owned(
        await tx.part.findFirst({
          where: {
            id: data.partId,
            active: true,
            compatibilities: { some: { deviceId: repair.device.unit.variant.productId } },
          },
        }),
      );
      if (part.cost === null)
        throw new AppError(
          409,
          'PART_COST_REQUIRED',
          'Record the received part cost before consumption.',
        );
      const updated = await tx.part.updateMany({
        where: { id: part.id, stock: { gte: data.quantity } },
        data: { stock: { decrement: data.quantity } },
      });
      if (!updated.count)
        throw new AppError(
          409,
          'PART_OUT_OF_STOCK',
          'Insufficient part stock. Receive the required parts first.',
        );
      await tx.partMovement.create({
        data: {
          partId: part.id,
          repairId: repair.id,
          type: 'CONSUMED',
          quantity: -data.quantity,
          unitCost: part.cost,
          reference: data.reference,
          actorId: req.user!.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'repair.part.consume',
          entity: 'Repair',
          entityId: repair.id,
          requestId: req.requestId,
          after: data,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.status(201).json({ ok: true });
});
repairOperations.get('/repairs/qc-checklist', permit('repair.read'), (_req, res) =>
  res.json(qcChecks),
);
repairOperations.post('/repairs/:id/qc', permit('repair.qc'), async (req, res) => {
  const data = z
    .object({
      checks: z
        .array(
          z
            .object({
              name: z.enum(qcChecks),
              passed: z.boolean(),
              detail: z.string().max(300).optional(),
            })
            .strict(),
        )
        .length(qcChecks.length),
      notes: z.string().max(1000).default(''),
    })
    .strict()
    .parse(req.body);
  if (new Set(data.checks.map((c) => c.name)).size !== qcChecks.length)
    throw new AppError(422, 'INCOMPLETE_QC', 'Complete every quality-control check once.');
  const row = await db.$transaction(
    async (tx) => {
      const repair = owned(await tx.repair.findUnique({ where: { id: String(req.params.id) } }));
      if (repair.status !== 'QUALITY_CONTROL')
        throw new AppError(
          409,
          'QC_STAGE_REQUIRED',
          'Move the repair to quality control before recording checks.',
        );
      if (
        process.env.REQUIRE_INDEPENDENT_REPAIR_QC === 'true' &&
        (!repair.technician || repair.technician === req.user!.id)
      )
        throw new AppError(
          409,
          'INDEPENDENT_QC_REQUIRED',
          'Assign the repairing technician and have a different authorized technician perform QC.',
        );
      // Serialize QC decisions against stage changes, so Ready cannot race a failing check.
      await tx.repair.update({ where: { id: repair.id }, data: { technician: repair.technician } });
      const passed = data.checks.every((c) => c.passed);
      const qc = await tx.repairQC.create({
        data: {
          repairId: repair.id,
          checkedBy: req.user!.id,
          approvedBy: passed ? req.user!.id : null,
          approvedAt: passed ? new Date() : null,
          status: passed ? 'PASSED' : 'FAILED',
          notes: data.notes,
          checklist: { create: data.checks.map((c) => ({ ...c, category: 'FUNCTIONAL' })) },
        },
        include: { checklist: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'repair.qc.record',
          entity: 'RepairQC',
          entityId: qc.id,
          requestId: req.requestId,
          after: { repairId: repair.id, status: qc.status },
        },
      });
      await serviceEvent(tx, {
        deviceId: repair.deviceId,
        type: passed ? 'QC_PASSED' : 'QC_RECHECK_REQUIRED',
        key: `qc:${qc.id}`,
        actor: { id: req.user!.id, requestId: req.requestId },
        reference: repair.id,
      });
      return qc;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.status(201).json(row);
});
