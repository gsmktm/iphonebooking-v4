import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, permit } from '../core.js';

export const repairAssignment = Router();
const assignableStages = [
  'REQUESTED',
  'RECEIVED',
  'INSPECTION',
  'DIAGNOSIS',
  'WAITING_CUSTOMER_APPROVAL',
  'APPROVED',
  'PARTS_REQUIRED',
  'REPAIR_IN_PROGRESS',
];
repairAssignment.get('/repair-technicians', permit('repair.assign'), async (req, res) => {
  const { q } = z.object({ q: z.string().trim().max(100).default('') }).parse(req.query);
  const rows = await db.user.findMany({
    where: {
      name: { contains: q, mode: 'insensitive' },
      role: { permissions: { hasSome: ['*', 'repair.update'] } },
    },
    select: {
      id: true,
      name: true,
      role: { select: { name: true } },
      _count: {
        select: {
          assignedRepairs: {
            where: { status: { in: [...assignableStages, 'QUALITY_CONTROL', 'READY'] } },
          },
        },
      },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: 50,
  });
  res.json(rows.map(({ _count, ...row }) => ({ ...row, activeRepairs: _count.assignedRepairs })));
});
repairAssignment.post('/repairs/:id/assign', permit('repair.assign'), async (req, res) => {
  const data = z
    .object({
      technicianId: z.string().min(1),
      expectedTechnicianId: z.string().min(1).nullable(),
      reason: z.string().trim().min(10).max(1000),
    })
    .strict()
    .parse(req.body);
  const result = await db.$transaction(
    async (tx) => {
      const repair = owned(await tx.repair.findUnique({ where: { id: String(req.params.id) } }));
      if (!assignableStages.includes(repair.status))
        throw new AppError(
          409,
          'ASSIGNMENT_STAGE_LOCKED',
          'Technician assignment is locked during QC, handover, or closed service. Return an eligible repair to work before reassigning.',
        );
      if (repair.assignedTechnicianId !== data.expectedTechnicianId)
        throw new AppError(
          409,
          'ASSIGNMENT_CHANGED',
          'Another staff member changed the technician. Refresh the repair before assigning.',
        );
      if (repair.assignedTechnicianId === data.technicianId)
        throw new AppError(409, 'ALREADY_ASSIGNED', 'This technician is already assigned.');
      const technician = await tx.user.findFirst({
        where: {
          id: data.technicianId,
          role: { permissions: { hasSome: ['*', 'repair.update'] } },
        },
        select: { id: true, name: true },
      });
      if (!technician)
        throw new AppError(
          422,
          'TECHNICIAN_NOT_ELIGIBLE',
          'Choose an existing staff account with repair work permission.',
        );
      await tx.repair.update({
        where: { id: repair.id },
        data: { assignedTechnicianId: technician.id },
      });
      const assignment = await tx.repairAssignment.create({
        data: {
          repairId: repair.id,
          technicianId: technician.id,
          assignedById: req.user!.id,
          reason: data.reason,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'repair.assign',
          entity: 'Repair',
          entityId: repair.id,
          requestId: req.requestId,
          before: { technicianId: repair.assignedTechnicianId },
          after: { technicianId: technician.id, assignmentId: assignment.id, reason: data.reason },
        },
      });
      return { id: assignment.id, technician };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.status(201).json(result);
});
