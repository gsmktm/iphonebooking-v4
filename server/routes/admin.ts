import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, owned, permit, hash } from '../core.js';
export const admin = Router();
const paging = z.object({
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().max(100).default(''),
});
admin.get('/dashboard', permit('report.read'), async (_req, res) => {
  const [orders, bookings, repairs, tradeIns, stock, revenue, recentOrders, events] =
    await Promise.all([
      db.order.count(),
      db.booking.count(),
      db.repair.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      db.tradeIn.count({ where: { status: 'SUBMITTED' } }),
      db.inventoryStock.findMany({
        where: { available: { lt: 3 } },
        include: { variant: { include: { product: true } } },
      }),
      db.payment.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true } }),
      db.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, number: true, name: true, total: true, status: true, createdAt: true },
      }),
      db.analyticsEvent.groupBy({ by: ['name'], _count: { name: true } }),
    ]);
  res.json({
    orders,
    bookings,
    repairs,
    tradeIns,
    lowStock: stock,
    revenue: revenue._sum.amount ?? 0,
    recentOrders,
    events,
  });
});
const permissions: Record<string, string> = {
  'order-ledger': 'payment.view',
  suppliers: 'procurement.read',
  'purchase-orders': 'procurement.read',
  receipts: 'inventory.read',
  products: 'product.read',
  categories: 'product.read',
  variants: 'product.read',
  inventory: 'inventory.read',
  'inventory-ledger': 'inventory.read',
  units: 'inventory.read',
  orders: 'order.read',
  bookings: 'order.read',
  payments: 'payment.view',
  refunds: 'payment.view',
  repairs: 'repair.read',
  'trade-ins': 'tradein.read',
  'valuation-rules': 'tradein.read',
  customers: 'customer.read',
  stores: 'store.read',
  content: 'content.read',
  tickets: 'support.read',
  notifications: 'support.read',
  roles: 'role.read',
  'audit-logs': 'audit.read',
  jobs: 'system.read',
  subscribers: 'content.read',
  'device-identity': 'device.read',
  parts: 'inventory.read',
  'part-movements': 'inventory.read',
  'identity-link': 'product.read',
  'device-event': 'device.read',
  'device-passport': 'product.read',
  'device-provenance': 'product.read',
  'device-risk-check': 'device.read',
  'condition-evidence': 'product.read',
  'condition-snapshot': 'product.read',
  'trade-in-quote': 'tradein.read',
  'refurbished-device': 'product.read',
  part: 'product.read',
  'part-supplier': 'product.read',
  'part-compatibility': 'product.read',
  'repair-bom': 'repair.read',
  'repair-bom-item': 'repair.read',
  'repair-qc': 'repair.read',
  'repair-qc-check-item': 'repair.read',
  'repair-warranty': 'repair.read',
  'device-replacement': 'repair.read',
  'pos-session': 'order.read',
  'scan-log': 'product.read',
  document: 'content.read',
  'document-version': 'content.read',
  appointment: 'store.read',
  'queue-token': 'store.read',
  'fulfillment-promise': 'order.read',
  'fulfillment-unit': 'inventory.read',
  'reverse-logistics': 'order.read',
  'courier-provider': 'order.read',
  'courier-shipment': 'order.read',
  'launch-config': 'product.read',
  'allocation-rule': 'inventory.read',
  'allocation-entry': 'inventory.read',
  'waitlist-entry': 'product.read',
  'bot-signal': 'system.read',
  'purchase-request': 'inventory.read',
  'purchase-order': 'inventory.read',
  'goods-received-note': 'inventory.read',
  'supplier-scorecard': 'inventory.read',
  'inventory-bin': 'inventory.read',
  'stocktake-session': 'inventory.read',
  'inventory-aging': 'inventory.read',
  'price-intelligence': 'product.read',
  'pricing-guardrail': 'product.read',
  'promotion-simulation': 'product.read',
  bundle: 'product.read',
  'bundle-item': 'product.read',
  organization: 'product.read',
  'bulk-quote': 'product.read',
  'financial-ledger': 'payment.view',
  'reconciliation-mismatch': 'payment.view',
  'financing-application': 'payment.view',
  'ai-conversation': 'product.read',
  'workflow-definition': 'system.read',
  'workflow-run': 'system.read',
  'workflow-step': 'system.read',
  'workflow-event': 'system.read',
  'workflow-task': 'system.read',
  'workflow-approval': 'system.read',
  'approval-request': 'system.read',
  'ops-alert': 'report.read',
  'sla-tracking': 'report.read',
  'escalation-policy': 'report.read',
  'feature-flag': 'system.read',
  experiment: 'system.read',
  'experiment-variant': 'system.read',
  'search-log': 'system.read',
  'data-quality-issue': 'system.read',
  'sync-change': 'system.read',
  'integration-config': 'system.read',
  'integration-log': 'system.read',
  'webhook-log': 'system.read',
  'outbox-message': 'system.read',
  forecast: 'report.read',
  simulation: 'report.read',
  'service-status': 'report.read',
  incident: 'report.read',
  'migration-run': 'system.read',
  'warranty-entitlement': 'product.read',
  'loyalty-ledger-entry': 'product.read',
  referral: 'product.read',
  'accessory-fit-check': 'product.read',
  'device-purchase': 'product.read',
  'customer-identity': 'customer.read',
  'customer-event': 'customer.read',
};
admin.get(
  '/:resource',
  (req, res, next) =>
    permit(permissions[String(req.params.resource)] ?? 'unavailable')(req, res, next),
  async (req, res) => {
    const { page, q } = paging.parse(req.query);
    const take = 50,
      skip = (page - 1) * take;
    const search = { contains: q, mode: 'insensitive' as const };
    let rows: unknown[] = [];
    let total = 0;
    switch (req.params.resource) {
      case 'products': {
        const where = { name: search };
        [rows, total] = await Promise.all([
          db.product.findMany({ where, include: { category: true, variants: true }, take, skip }),
          db.product.count({ where }),
        ]);
        break;
      }
      case 'categories':
        [rows, total] = await Promise.all([
          db.category.findMany({ take, skip }),
          db.category.count(),
        ]);
        break;
      case 'variants':
        [rows, total] = await Promise.all([
          db.productVariant.findMany({
            where: { sku: search },
            include: { product: true },
            take,
            skip,
          }),
          db.productVariant.count({ where: { sku: search } }),
        ]);
        break;
      case 'inventory':
        [rows, total] = await Promise.all([
          db.inventoryStock.findMany({
            include: { variant: { include: { product: true } }, store: true },
            take,
            skip,
          }),
          db.inventoryStock.count(),
        ]);
        break;
      case 'inventory-ledger':
        [rows, total] = await Promise.all([
          db.inventoryLedger.findMany({ orderBy: { createdAt: 'desc' }, take, skip }),
          db.inventoryLedger.count(),
        ]);
        break;
      case 'units':
        [rows, total] = await Promise.all([
          db.inventoryUnit.findMany({
            select: {
              id: true,
              serialLast4: true,
              status: true,
              variant: { select: { sku: true } },
            },
            take,
            skip,
          }),
          db.inventoryUnit.count(),
        ]);
        break;
      case 'orders': {
        const where = { OR: [{ number: search }, { email: search }, { name: search }] };
        [rows, total] = await Promise.all([
          db.order.findMany({
            where,
            omit: { trackingHash: true, idempotencyKey: true },
            include: {
              items: { include: { variant: { include: { product: true } } } },
              payments: true,
            },
            orderBy: { createdAt: 'desc' },
            take,
            skip,
          }),
          db.order.count({ where }),
        ]);
        break;
      }
      case 'bookings':
        [rows, total] = await Promise.all([
          db.booking.findMany({
            include: { order: { select: { number: true, name: true, dueNow: true, total: true } } },
            take,
            skip,
          }),
          db.booking.count(),
        ]);
        break;
      case 'payments':
        [rows, total] = await Promise.all([
          db.payment.findMany({ include: { order: { select: { number: true } } }, take, skip }),
          db.payment.count(),
        ]);
        break;
      case 'refunds':
        [rows, total] = await Promise.all([db.refund.findMany({ take, skip }), db.refund.count()]);
        break;
      case 'repairs':
        [rows, total] = await Promise.all([
          db.repair.findMany({
            include: { user: { select: { name: true, email: true } }, quotes: true, history: true },
            take,
            skip,
          }),
          db.repair.count(),
        ]);
        break;
      case 'trade-ins':
        [rows, total] = await Promise.all([
          db.tradeIn.findMany({ include: { user: { select: { name: true } } }, take, skip }),
          db.tradeIn.count(),
        ]);
        break;
      case 'valuation-rules':
        [rows, total] = await Promise.all([
          db.tradeInRule.findMany({ take, skip }),
          db.tradeInRule.count(),
        ]);
        break;
      case 'customers':
        [rows, total] = await Promise.all([
          db.user.findMany({
            where: { OR: [{ name: search }, { email: search }] },
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              role: { select: { name: true } },
            },
            take,
            skip,
          }),
          db.user.count({ where: { OR: [{ name: search }, { email: search }] } }),
        ]);
        break;
      case 'stores':
        [rows, total] = await Promise.all([db.store.findMany({ take, skip }), db.store.count()]);
        break;
      case 'content':
        [rows, total] = await Promise.all([
          db.cMSPage.findMany({ take, skip }),
          db.cMSPage.count(),
        ]);
        break;
      case 'tickets':
        [rows, total] = await Promise.all([
          db.supportTicket.findMany({
            include: { messages: true, user: { select: { name: true } } },
            take,
            skip,
          }),
          db.supportTicket.count(),
        ]);
        break;
      case 'notifications':
        [rows, total] = await Promise.all([
          db.notification.findMany({ take, skip }),
          db.notification.count(),
        ]);
        break;
      case 'roles':
        [rows, total] = await Promise.all([db.role.findMany({ take, skip }), db.role.count()]);
        break;
      case 'audit-logs':
        [rows, total] = await Promise.all([
          db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take, skip }),
          db.auditLog.count(),
        ]);
        break;
      case 'jobs':
        [rows, total] = await Promise.all([
          db.job.findMany({
            select: { id: true, type: true, status: true, attempts: true, runAt: true },
            take,
            skip,
          }),
          db.job.count(),
        ]);
        break;
      case 'subscribers':
        [rows, total] = await Promise.all([
          db.subscriber.findMany({ take, skip }),
          db.subscriber.count(),
        ]);
        break;
      case 'order-ledger':
        [rows, total] = await Promise.all([
          db.orderMoneyEntry.findMany({
            take,
            skip,
            orderBy: { createdAt: 'desc' },
            include: { order: { select: { number: true } } },
          }),
          db.orderMoneyEntry.count(),
        ]);
        break;
      case 'suppliers':
        [rows, total] = await Promise.all([
          db.partSupplier.findMany({ take, skip, orderBy: { name: 'asc' } }),
          db.partSupplier.count(),
        ]);
        break;
      case 'purchase-orders':
        [rows, total] = await Promise.all([
          db.purchaseOrder.findMany({
            take,
            skip,
            include: { supplier: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          }),
          db.purchaseOrder.count(),
        ]);
        break;
      case 'receipts':
        [rows, total] = await Promise.all([
          db.goodsReceivedNote.findMany({
            take,
            skip,
            include: {
              po: { select: { poNumber: true } },
              units: {
                select: { id: true, variantId: true, serialLast4: true, status: true, cost: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          db.goodsReceivedNote.count(),
        ]);
        break;
      case 'device-risk-check':
        [rows, total] = await Promise.all([
          db.deviceRiskCheck.findMany({
            take,
            skip,
            select: {
              id: true,
              checkType: true,
              result: true,
              performedAt: true,
              details: true,
              device: { select: { canonicalId: true } },
            },
            orderBy: { performedAt: 'desc' },
          }),
          db.deviceRiskCheck.count(),
        ]);
        break;
      case 'device-identity':
        [rows, total] = await Promise.all([
          db.deviceIdentity.findMany({
            select: {
              id: true,
              canonicalId: true,
              status: true,
              createdAt: true,
              product: { select: { name: true } },
              unit: {
                select: {
                  serialLast4: true,
                  stock: { select: { store: { select: { name: true } } } },
                },
              },
            },
            take,
            skip,
            orderBy: { createdAt: 'desc' },
          }),
          db.deviceIdentity.count(),
        ]);
        break;
      case 'device-event':
        [rows, total] = await Promise.all([
          db.deviceEvent.findMany({
            select: {
              id: true,
              eventType: true,
              timestamp: true,
              reference: true,
              location: true,
              device: { select: { canonicalId: true } },
            },
            take,
            skip,
            orderBy: { timestamp: 'desc' },
          }),
          db.deviceEvent.count(),
        ]);
        break;
      case 'parts':
        [rows, total] = await Promise.all([
          db.part.findMany({
            take,
            skip,
            include: { compatibilities: { include: { device: { select: { name: true } } } } },
            orderBy: { name: 'asc' },
          }),
          db.part.count(),
        ]);
        break;
      case 'part-movements':
        [rows, total] = await Promise.all([
          db.partMovement.findMany({
            take,
            skip,
            include: { part: { select: { sku: true, name: true } } },
            orderBy: { createdAt: 'desc' },
          }),
          db.partMovement.count(),
        ]);
        break;
      case 'repair-qc':
        [rows, total] = await Promise.all([
          db.repairQC.findMany({
            take,
            skip,
            include: { checklist: true },
            orderBy: { checkedAt: 'desc' },
          }),
          db.repairQC.count(),
        ]);
        break;
      case 'repair-warranty':
        [rows, total] = await Promise.all([
          db.repairWarranty.findMany({ take, skip, orderBy: { startDate: 'desc' } }),
          db.repairWarranty.count(),
        ]);
        break;
      case 'trade-in-quote':
        [rows, total] = await Promise.all([
          db.tradeInQuote.findMany({ take, skip, orderBy: { createdAt: 'desc' } }),
          db.tradeInQuote.count(),
        ]);
        break;
      default: {
        throw new AppError(
          501,
          'WORKFLOW_NOT_IMPLEMENTED',
          'This module has a schema only. Its validated operational workflow is still being implemented.',
        );
      }
    }
    res.json({ rows, total, page, pageSize: take });
  },
);
const productSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  tagline: z.string().max(200),
  description: z.string().max(4000),
  categoryId: z.string(),
  image: z.string().regex(/^\/images\/[a-zA-Z0-9._-]+$/),
  gallery: z.array(z.string()).default([]),
  specs: z.record(z.string()).default({}),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  badge: z.string().max(30).nullable().optional(),
});
admin.post('/products', permit('product.create'), async (req, res) => {
  const data = productSchema.parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const result = await tx.product.create({ data });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'product.create',
        entity: 'Product',
        entityId: result.id,
        requestId: req.requestId,
        after: data,
      },
    });
    return result;
  });
  res.status(201).json(result);
});
admin.patch('/products/:id', permit('product.update'), async (req, res) => {
  const data = productSchema.partial().parse(req.body);
  res.json(
    await db.$transaction(async (tx) => {
      const before = owned(await tx.product.findUnique({ where: { id: String(req.params.id) } }));
      const after = await tx.product.update({ where: { id: before.id }, data });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'product.update',
          entity: 'Product',
          entityId: before.id,
          before: JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue,
          after: JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue,
          requestId: req.requestId,
        },
      });
      return after;
    }),
  );
});
admin.patch('/variants/:id', permit('product.update'), async (req, res) => {
  const data = z
    .object({
      price: z.number().int().min(100).max(1000000000),
      deposit: z.number().int().min(0).max(1000000000),
      preorder: z.boolean(),
    })
    .refine((v) => v.deposit <= v.price)
    .parse(req.body);
  res.json(
    await db.$transaction(async (tx) => {
      const before = owned(
        await tx.productVariant.findUnique({ where: { id: String(req.params.id) } }),
      );
      const after = await tx.productVariant.update({ where: { id: before.id }, data });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'price.update',
          entity: 'ProductVariant',
          entityId: before.id,
          before: { price: before.price, deposit: before.deposit },
          after: data,
          requestId: req.requestId,
        },
      });
      return after;
    }),
  );
});
admin.post('/inventory/:id/adjust', permit('inventory.adjust'), async (req, res) => {
  const data = z
    .object({
      quantity: z
        .number()
        .int()
        .min(-10000)
        .max(10000)
        .refine((v) => v !== 0),
      reason: z.string().min(5).max(300),
    })
    .parse(req.body);
  await db.$transaction(
    async (tx) => {
      const stock = owned(
        await tx.inventoryStock.findUnique({ where: { id: String(req.params.id) } }),
      );
      if (stock.available + data.quantity < 0)
        throw new AppError(
          409,
          'NEGATIVE_STOCK',
          'This adjustment would make available stock negative.',
        );
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { available: { increment: data.quantity } },
      });
      await tx.inventoryLedger.create({
        data: {
          stockId: stock.id,
          type: 'ADJUSTMENT',
          quantity: data.quantity,
          reference: req.requestId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'inventory.adjust',
          entity: 'InventoryStock',
          entityId: stock.id,
          after: data,
          requestId: req.requestId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  res.json({ ok: true });
});
admin.patch('/content/:id', permit('content.update'), async (req, res) => {
  const data = z
    .object({
      title: z.string().min(1).max(160),
      description: z.string().max(300),
      published: z.boolean(),
      blocks: z
        .array(
          z.object({
            type: z.enum(['hero', 'text', 'faq', 'cta']),
            title: z.string().max(200),
            body: z.string().max(5000),
            href: z
              .string()
              .regex(/^\/(?!\/)/)
              .optional(),
          }),
        )
        .max(30),
    })
    .parse(req.body);
  res.json(
    await db.$transaction(async (tx) => {
      const result = await tx.cMSPage.update({ where: { id: String(req.params.id) }, data });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'content.update',
          entity: 'CMSPage',
          entityId: result.id,
          after: data,
          requestId: req.requestId,
        },
      });
      return result;
    }),
  );
});
admin.patch('/valuation-rules/:id', permit('tradein.update'), async (req, res) => {
  const data = z
    .object({
      baseValue: z.number().int().min(0).max(100000000),
      goodPercent: z.number().int().min(0).max(100),
      fairPercent: z.number().int().min(0).max(100),
      damagedPercent: z.number().int().min(0).max(100),
      active: z.boolean(),
    })
    .parse(req.body);
  res.json(
    await db.$transaction(async (tx) => {
      const result = await tx.tradeInRule.update({ where: { id: String(req.params.id) }, data });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'valuation.update',
          entity: 'TradeInRule',
          entityId: result.id,
          after: data,
          requestId: req.requestId,
        },
      });
      return result;
    }),
  );
});
