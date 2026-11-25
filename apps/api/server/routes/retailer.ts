import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AppError, hash, owned, permit, requireUser } from '../core.js';
import { db } from '../db.js';
import {
  retailerAccess,
  retailerAudit,
  retailerOrderScope,
  retailerRoles,
  retailerSummary,
  storeSummary,
} from '../services/retailer-access.js';

export const retailer = Router();
const serializable = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };
const pagination = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  take: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(100).default(''),
  storeId: z.string().min(1).max(100).optional(),
});
const applicationSelect = {
  id: true,
  businessName: true,
  contactName: true,
  contactPhone: true,
  city: true,
  address: true,
  note: true,
  status: true,
  reviewNote: true,
  reviewedAt: true,
  retailerId: true,
  createdAt: true,
} satisfies Prisma.RetailerApplicationSelect;
const applicationSchema = z
  .object({
    businessName: z.string().trim().min(2).max(120),
    contactName: z.string().trim().min(2).max(100),
    contactPhone: z
      .string()
      .trim()
      .min(7)
      .max(25)
      .regex(/^[+\d ()-]+$/),
    city: z.string().trim().min(2).max(100),
    address: z.string().trim().min(8).max(300),
    note: z.string().trim().min(20).max(2000),
  })
  .strict();

retailer.get('/retailer-network', async (req, res) => {
  const { q, page, take } = pagination.parse(req.query);
  const where: Prisma.StoreWhereInput = {
    retailer: { status: 'ACTIVE' },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [items, total] = await db.$transaction([
    db.store.findMany({
      where,
      select: { ...storeSummary, retailer: { select: { name: true, region: true } } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take,
      skip: (page - 1) * take,
    }),
    db.store.count({ where }),
  ]);
  res.json({ items, total, page, take });
});

retailer.get('/retailer-applications', requireUser, async (req, res) => {
  res.json(
    await db.retailerApplication.findUnique({
      where: { applicantId: req.user!.id },
      select: applicationSelect,
    }),
  );
});
retailer.post('/retailer-applications', requireUser, async (req, res) => {
  const data = applicationSchema.parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const before = await tx.retailerApplication.findUnique({
      where: { applicantId: req.user!.id },
    });
    if (before && before.status !== 'REJECTED')
      throw new AppError(
        409,
        'APPLICATION_EXISTS',
        'Your retailer application has already been submitted.',
      );
    if (await tx.retailerMember.count({ where: { userId: req.user!.id, active: true } }))
      throw new AppError(
        409,
        'MEMBERSHIP_EXISTS',
        'Use your existing retailer workspace to manage your business.',
      );
    const application = before
      ? await tx.retailerApplication.update({
          where: { id: before.id },
          data: {
            ...data,
            status: 'PENDING',
            reviewNote: null,
            reviewedBy: null,
            reviewedAt: null,
          },
          select: applicationSelect,
        })
      : await tx.retailerApplication.create({
          data: { ...data, applicantId: req.user!.id },
          select: applicationSelect,
        });
    await retailerAudit(
      tx,
      req,
      before ? 'retailer.application.resubmit' : 'retailer.application.submit',
      'RetailerApplication',
      application.id,
      { status: 'PENDING' },
    );
    return application;
  }, serializable);
  res.status(201).json(result);
});

retailer.get('/retailer/memberships', requireUser, async (req, res) => {
  res.json(
    await db.retailerMember.findMany({
      where: {
        userId: req.user!.id,
        active: true,
        role: { in: [...retailerRoles] },
        user: { status: 'ACTIVE' },
        retailer: { status: 'ACTIVE' },
      },
      select: { id: true, role: true, retailer: { select: retailerSummary } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
  );
});
retailer.get('/retailer/:retailerId', requireUser, async (req, res) => {
  const member = await retailerAccess(req.user!.id, String(req.params.retailerId));
  const stores = await db.store.findMany({
    where: { retailerId: member.retailer.id },
    select: storeSummary,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
  res.json({ ...member.retailer, role: member.role, stores });
});
retailer.get('/retailer/:retailerId/inventory', requireUser, async (req, res) => {
  const member = await retailerAccess(req.user!.id, String(req.params.retailerId));
  const { q, storeId, page, take } = pagination.parse(req.query);
  if (storeId)
    owned(
      await db.store.findFirst({
        where: { id: storeId, retailerId: member.retailer.id },
        select: { id: true },
      }),
    );
  const where: Prisma.InventoryStockWhereInput = {
    store: { retailerId: member.retailer.id },
    ...(storeId ? { storeId } : {}),
    ...(q
      ? {
          variant: {
            OR: [
              { sku: { contains: q, mode: 'insensitive' } },
              { product: { name: { contains: q, mode: 'insensitive' } } },
            ],
          },
        }
      : {}),
  };
  const [items, total] = await db.$transaction([
    db.inventoryStock.findMany({
      where,
      select: {
        id: true,
        available: true,
        reserved: true,
        store: { select: { id: true, name: true } },
        variant: {
          select: {
            id: true,
            sku: true,
            color: true,
            storage: true,
            product: { select: { name: true, slug: true } },
          },
        },
        _count: { select: { units: true } },
      },
      orderBy: [{ variant: { product: { name: 'asc' } } }, { id: 'asc' }],
      take,
      skip: (page - 1) * take,
    }),
    db.inventoryStock.count({ where }),
  ]);
  res.json({
    items: items.map(({ _count, ...item }) => ({ ...item, trackedUnits: _count.units > 0 })),
    total,
    page,
    take,
  });
});
retailer.post('/retailer/:retailerId/inventory/:stockId/adjust', requireUser, async (req, res) => {
  const data = z
    .object({
      quantity: z
        .number()
        .int()
        .min(-10000)
        .max(10000)
        .refine((value) => value !== 0),
      expectedAvailable: z.number().int().min(0),
      reason: z.string().trim().min(10).max(300),
      idempotencyKey: z.string().uuid(),
    })
    .strict()
    .parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const member = await retailerAccess(
      req.user!.id,
      String(req.params.retailerId),
      ['OWNER', 'MANAGER'],
      tx,
    );
    const stock = owned(
      await tx.inventoryStock.findFirst({
        where: { id: String(req.params.stockId), store: { retailerId: member.retailer.id } },
        select: { id: true, available: true, reserved: true, _count: { select: { units: true } } },
      }),
    );
    const ledgerId = `retailer-adjust-${data.idempotencyKey}`;
    const reference = hash(
      JSON.stringify({
        retailerId: member.retailer.id,
        stockId: stock.id,
        actorId: req.user!.id,
        ...data,
      }),
    );
    const previous = await tx.inventoryLedger.findUnique({ where: { id: ledgerId } });
    if (previous) {
      if (previous.reference !== reference)
        throw new AppError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This adjustment reference has already been used.',
        );
      return { ok: true, replayed: true };
    }
    if (stock._count.units)
      throw new AppError(
        409,
        'TRACKED_STOCK_REQUIRES_RECEIVING',
        'Stock with tracked device units must be changed through receiving or fulfillment. Contact operations.',
      );
    if (stock.available !== data.expectedAvailable)
      throw new AppError(
        409,
        'STOCK_CHANGED',
        'Stock changed while you were working. Refresh before making an adjustment.',
      );
    if (stock.available + data.quantity < 0)
      throw new AppError(
        409,
        'NEGATIVE_STOCK',
        'This adjustment would make available stock negative.',
      );
    const after = await tx.inventoryStock.update({
      where: { id: stock.id },
      data: { available: { increment: data.quantity } },
      select: { available: true },
    });
    await tx.inventoryLedger.create({
      data: {
        id: ledgerId,
        stockId: stock.id,
        type: 'RETAILER_ADJUSTMENT',
        quantity: data.quantity,
        reference,
      },
    });
    await retailerAudit(
      tx,
      req,
      'retailer.inventory.adjust',
      'InventoryStock',
      stock.id,
      {
        retailerId: member.retailer.id,
        available: after.available,
        quantity: data.quantity,
        reason: data.reason,
        ledgerId,
      },
      { available: stock.available, reserved: stock.reserved },
    );
    return { ok: true, replayed: false };
  }, serializable);
  res.json(result);
});

retailer.get('/retailer/:retailerId/orders', requireUser, async (req, res) => {
  const member = await retailerAccess(req.user!.id, String(req.params.retailerId));
  const { q, storeId, page, take } = pagination.parse(req.query);
  const scopedItems = await retailerOrderScope(member.retailer.id, storeId);
  const where: Prisma.OrderWhereInput = {
    items: { some: scopedItems },
    ...(q ? { number: { contains: q, mode: 'insensitive' } } : {}),
  };
  const [items, total] = await db.$transaction([
    db.order.findMany({
      where,
      select: {
        id: true,
        number: true,
        status: true,
        fulfillment: true,
        createdAt: true,
        items: {
          where: scopedItems,
          select: {
            id: true,
            stockId: true,
            quantity: true,
            variant: {
              select: {
                sku: true,
                color: true,
                storage: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      skip: (page - 1) * take,
    }),
    db.order.count({ where }),
  ]);
  res.json({ items, total, page, take });
});

retailer.get('/retailer/:retailerId/members', requireUser, async (req, res) => {
  const member = await retailerAccess(req.user!.id, String(req.params.retailerId), ['OWNER']);
  res.json(
    await db.retailerMember.findMany({
      where: { retailerId: member.retailer.id },
      select: {
        id: true,
        role: true,
        active: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
  );
});
retailer.post('/retailer/:retailerId/members', requireUser, async (req, res) => {
  const data = z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
      role: z.enum(['MANAGER', 'VIEWER']),
    })
    .strict()
    .parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const member = await retailerAccess(req.user!.id, String(req.params.retailerId), ['OWNER'], tx);
    const user = await tx.user.findFirst({
      where: { email: data.email, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!user)
      throw new AppError(
        422,
        'ACCOUNT_NOT_ELIGIBLE',
        'Ask your teammate to create an active account with this email first.',
      );
    const before = await tx.retailerMember.findUnique({
      where: { retailerId_userId: { retailerId: member.retailer.id, userId: user.id } },
    });
    if (before?.role === 'OWNER')
      throw new AppError(409, 'OWNER_PROTECTED', 'Owner membership must be managed by operations.');
    if (before?.active)
      throw new AppError(
        409,
        'MEMBER_EXISTS',
        'This person is already an active member. Edit their existing access.',
      );
    const after = await tx.retailerMember.upsert({
      where: { retailerId_userId: { retailerId: member.retailer.id, userId: user.id } },
      create: { retailerId: member.retailer.id, userId: user.id, role: data.role },
      update: { role: data.role, active: true },
      select: { id: true },
    });
    await retailerAudit(tx, req, 'retailer.member.add', 'RetailerMember', after.id, {
      retailerId: member.retailer.id,
      userId: user.id,
      role: data.role,
      active: true,
    });
    return after;
  }, serializable);
  res.status(201).json(result);
});
retailer.patch('/retailer/:retailerId/members/:memberId', requireUser, async (req, res) => {
  const data = z
    .object({ role: z.enum(['MANAGER', 'VIEWER']), active: z.boolean() })
    .strict()
    .parse(req.body);
  await db.$transaction(async (tx) => {
    const actor = await retailerAccess(req.user!.id, String(req.params.retailerId), ['OWNER'], tx);
    const before = owned(
      await tx.retailerMember.findFirst({
        where: { id: String(req.params.memberId), retailerId: actor.retailer.id },
      }),
    );
    if (before.role === 'OWNER')
      throw new AppError(409, 'OWNER_PROTECTED', 'Owner membership must be managed by operations.');
    await tx.retailerMember.update({ where: { id: before.id }, data });
    await retailerAudit(
      tx,
      req,
      'retailer.member.update',
      'RetailerMember',
      before.id,
      { retailerId: actor.retailer.id, ...data },
      { role: before.role, active: before.active },
    );
  }, serializable);
  res.json({ ok: true });
});

retailer.get('/admin/retailer-applications', permit('retailer.read'), async (req, res) => {
  const { page, take, q, status } = pagination
    .extend({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() })
    .parse(req.query);
  const where: Prisma.RetailerApplicationWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { businessName: { contains: q, mode: 'insensitive' } } : {}),
  };
  const [items, total] = await db.$transaction([
    db.retailerApplication.findMany({
      where,
      select: { ...applicationSelect, applicant: { select: { name: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      skip: (page - 1) * take,
    }),
    db.retailerApplication.count({ where }),
  ]);
  res.json({ items, total, page, take });
});
retailer.get('/admin/retailer-stores', permit('retailer.manage'), async (req, res) => {
  const { page, take, q } = pagination.parse(req.query);
  const where: Prisma.StoreWhereInput = {
    retailerId: null,
    ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
  };
  const [items, total] = await db.$transaction([
    db.store.findMany({
      where,
      select: storeSummary,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * take,
      take,
    }),
    db.store.count({ where }),
  ]);
  res.json({ items, total, page, take });
});
retailer.post(
  '/admin/retailer-applications/:id/review',
  permit('retailer.manage'),
  async (req, res) => {
    const data = z
      .discriminatedUnion('decision', [
        z
          .object({
            decision: z.literal('APPROVED'),
            reviewNote: z.string().trim().min(10).max(1000),
            code: z
              .string()
              .trim()
              .toUpperCase()
              .min(3)
              .max(30)
              .regex(/^[A-Z0-9-]+$/),
            storeIds: z.array(z.string().min(1).max(100)).max(20).default([]),
          })
          .strict(),
        z
          .object({
            decision: z.literal('REJECTED'),
            reviewNote: z.string().trim().min(10).max(1000),
          })
          .strict(),
      ])
      .parse(req.body);
    const result = await db.$transaction(async (tx) => {
      const application = owned(
        await tx.retailerApplication.findUnique({
          where: { id: String(req.params.id) },
          include: { applicant: { select: { email: true, status: true } } },
        }),
      );
      if (application.status !== 'PENDING')
        throw new AppError(
          409,
          'APPLICATION_REVIEWED',
          'This application has already been reviewed. Refresh the list.',
        );
      const now = new Date();
      let retailerId: string | null = null;
      if (data.decision === 'APPROVED') {
        if (application.applicant.status !== 'ACTIVE')
          throw new AppError(
            409,
            'APPLICANT_INACTIVE',
            'The applicant must have an active account before approval.',
          );
        const storeIds = [...new Set(data.storeIds)];
        const eligible = await tx.store.count({
          where: { id: { in: storeIds }, retailerId: null },
        });
        if (eligible !== storeIds.length)
          throw new AppError(
            409,
            'STORE_UNAVAILABLE',
            'One or more stores are already assigned or unavailable. Refresh the available stores.',
          );
        const created = await tx.retailer.create({
          data: {
            code: data.code,
            name: application.businessName,
            contactName: application.contactName,
            contactEmail: application.applicant.email,
            region: application.city,
            members: { create: { userId: application.applicantId, role: 'OWNER' } },
          },
          select: { id: true },
        });
        retailerId = created.id;
        const assigned = await tx.store.updateMany({
          where: { id: { in: storeIds }, retailerId: null },
          data: { retailerId, retailerAssignedAt: now },
        });
        if (assigned.count !== storeIds.length)
          throw new AppError(
            409,
            'STORE_UNAVAILABLE',
            'A store assignment changed. Refresh before approving.',
          );
        for (const storeId of storeIds)
          await retailerAudit(tx, req, 'retailer.store.assign', 'Store', storeId, {
            retailerId,
            assignedAt: now.toISOString(),
          });
      }
      const reviewed = await tx.retailerApplication.update({
        where: { id: application.id },
        data: {
          status: data.decision,
          reviewNote: data.reviewNote,
          reviewedAt: now,
          reviewedBy: req.user!.id,
          retailerId,
        },
        select: applicationSelect,
      });
      await retailerAudit(
        tx,
        req,
        'retailer.application.review',
        'RetailerApplication',
        application.id,
        { status: data.decision, reviewNote: data.reviewNote, retailerId },
        { status: application.status },
      );
      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title:
            data.decision === 'APPROVED'
              ? 'Your retailer workspace is ready'
              : 'Retailer application reviewed',
          body: data.reviewNote,
        },
      });
      return reviewed;
    }, serializable);
    res.json(result);
  },
);
retailer.post(
  '/admin/retailers/:retailerId/stores',
  permit('retailer.manage'),
  async (req, res) => {
    const { storeId } = z
      .object({ storeId: z.string().min(1).max(100) })
      .strict()
      .parse(req.body);
    await db.$transaction(async (tx) => {
      const tenant = owned(
        await tx.retailer.findFirst({
          where: { id: String(req.params.retailerId), status: 'ACTIVE' },
          select: { id: true },
        }),
      );
      const now = new Date();
      const assigned = await tx.store.updateMany({
        where: { id: storeId, retailerId: null },
        data: { retailerId: tenant.id, retailerAssignedAt: now },
      });
      if (assigned.count !== 1)
        throw new AppError(
          409,
          'STORE_UNAVAILABLE',
          'This store is already assigned or unavailable.',
        );
      await retailerAudit(tx, req, 'retailer.store.assign', 'Store', storeId, {
        retailerId: tenant.id,
        assignedAt: now.toISOString(),
      });
    }, serializable);
    res.status(201).json({ ok: true });
  },
);
