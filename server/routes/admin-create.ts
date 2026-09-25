import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db } from '../db.js';
import { createContentSchema } from '../schemas/content.js';
import { assertGrantable } from '../services/permissions.js';
import { permit, AppError, owned } from '../core.js';
export const adminCreate = Router();
const slug = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9-]+$/);
const short = z.string().min(1).max(200);
adminCreate.post('/categories', permit('product.create'), async (req, res) => {
  const data = z
    .object({ slug, name: short, description: z.string().max(1000), image: short })
    .parse(req.body);
  res.status(201).json(await db.category.create({ data }));
});
adminCreate.post('/variants', permit('product.create'), async (req, res) => {
  const data = z
    .object({
      productId: z.string(),
      sku: short,
      color: short,
      colorHex: z.string().regex(/^#[a-fA-F0-9]{6}$/),
      storage: short,
      price: z.number().int().min(100).max(1000000000),
      deposit: z.number().int().min(0).max(1000000000),
      preorder: z.boolean(),
    })
    .refine((d) => d.deposit <= d.price, { message: 'Deposit cannot exceed the selling price.' })
    .parse(req.body);
  res.status(201).json(
    await db.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({ data });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'variant.create',
          entity: 'ProductVariant',
          entityId: variant.id,
          after: data,
          requestId: req.requestId,
        },
      });
      return variant;
    }),
  );
});
adminCreate.post('/inventory', permit('inventory.adjust'), async (req, res) => {
  const data = z
    .object({
      variantId: z.string(),
      storeId: z.string(),
      quantity: z.number().int().min(0).max(10000),
      reference: short,
    })
    .parse(req.body);
  res.status(201).json(
    await db.$transaction(async (tx) => {
      const stock = await tx.inventoryStock.create({
        data: { variantId: data.variantId, storeId: data.storeId, available: data.quantity },
      });
      await tx.inventoryLedger.create({
        data: {
          stockId: stock.id,
          type: 'PURCHASE_IN',
          quantity: data.quantity,
          reference: data.reference,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'inventory.receive',
          entity: 'InventoryStock',
          entityId: stock.id,
          after: data,
          requestId: req.requestId,
        },
      });
      return stock;
    }),
  );
});
adminCreate.post('/stores', permit('store.update'), async (req, res) => {
  const data = z
    .object({
      slug,
      name: short,
      address: short,
      hours: short,
      phone: short,
      services: z.array(short).max(20),
    })
    .parse(req.body);
  res.status(201).json(await db.store.create({ data }));
});
adminCreate.post('/content', permit('content.update'), async (req, res) => {
  const data = createContentSchema.parse(req.body);
  res.status(201).json(
    await db.$transaction(async (tx) => {
      const page = await tx.cMSPage.create({ data });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'content.create',
          entity: 'CMSPage',
          entityId: page.id,
          after: data,
          requestId: req.requestId,
        },
      });
      return page;
    }),
  );
});
adminCreate.post('/valuation-rules', permit('tradein.update'), async (req, res) => {
  const data = z
    .object({ model: short, baseValue: z.number().int().min(0).max(100000000) })
    .parse(req.body);
  res.status(201).json(await db.tradeInRule.create({ data }));
});
adminCreate.patch('/customers/:id/role', permit('role.manage'), async (req, res) => {
  const { roleId } = z.object({ roleId: z.string().nullable() }).parse(req.body);
  if (req.params.id === req.user!.id)
    throw new AppError(
      409,
      'SELF_ROLE_CHANGE',
      'Have another authorized administrator change your own role.',
    );
  await db.$transaction(async (tx) => {
    const user = owned(
      await tx.user.findUnique({ where: { id: String(req.params.id) }, include: { role: true } }),
    );
    // A delegated role manager cannot alter a more privileged account either.
    assertGrantable(req.user!, user.role?.permissions ?? []);
    if (roleId) {
      const role = owned(await tx.role.findUnique({ where: { id: roleId } }));
      assertGrantable(req.user!, role.permissions);
    }
    await tx.user.update({ where: { id: String(req.params.id) }, data: { roleId } });
    await tx.userSession.deleteMany({ where: { userId: String(req.params.id) } });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'role.assign',
        entity: 'User',
        entityId: String(req.params.id),
        after: { roleId },
        requestId: req.requestId,
      },
    });
  });
  res.json({ ok: true });
});
