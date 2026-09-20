import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, permit } from '../core.js';
import { assertGrantable, permissionCatalog } from '../services/permissions.js';
export const roles = Router();
const roleSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    permissions: z.array(z.enum(permissionCatalog)).max(permissionCatalog.length),
  })
  .strict();
roles.get('/permission-catalog', permit('role.read'), (_req, res) => res.json(permissionCatalog));
roles.post('/roles', permit('role.manage'), async (req, res) => {
  const data = roleSchema.parse(req.body);
  assertGrantable(req.user!, data.permissions);
  const role = await db.$transaction(async (tx) => {
    const row = await tx.role.create({
      data: { ...data, permissions: [...new Set(data.permissions)] },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'role.create',
        entity: 'Role',
        entityId: row.id,
        requestId: req.requestId,
        after: data,
      },
    });
    return row;
  });
  res.status(201).json(role);
});
roles.patch('/roles/:id', permit('role.manage'), async (req, res) => {
  const data = roleSchema.parse(req.body);
  assertGrantable(req.user!, data.permissions);
  await db.$transaction(
    async (tx) => {
      const role = owned(await tx.role.findUnique({ where: { id: String(req.params.id) } }));
      if (role.permissions.includes('*') || req.user!.roleId === role.id)
        throw new AppError(
          409,
          'PROTECTED_ROLE',
          'System administrator roles and your own role cannot be changed here.',
        );
      assertGrantable(req.user!, role.permissions);
      await tx.role.update({
        where: { id: role.id },
        data: { ...data, permissions: [...new Set(data.permissions)] },
      });
      await tx.userSession.deleteMany({ where: { user: { roleId: role.id } } });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'role.update',
          entity: 'Role',
          entityId: role.id,
          requestId: req.requestId,
          before: { name: role.name, permissions: role.permissions },
          after: data,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.json({ ok: true });
});
