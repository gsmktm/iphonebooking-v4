import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { app } from '../../server/app';
import { db } from '../../server/db';
import { hash, token } from '../../server/core';
import { qcChecks } from '../../server/services/repair-quality';
import { expireReservations } from '../../server/services/orders';
const prefix = `test-${randomUUID()}`;
let customer: string,
  other: string,
  admin: string,
  variantId: string,
  stockId: string,
  limitedVariant: string,
  orderId: string,
  deviceId: string,
  repairId: string,
  quoteId: string,
  tradeInId: string,
  customerId: string,
  receiptKey: string,
  orderNumber: string;
const write = (method: 'post' | 'patch' | 'put' | 'delete', path: string, cookie?: string) => {
  const req = request(app)
    [method](`/api/v1${path}`)
    .set('X-Requested-With', 'iPhoneBooking')
    .set('Origin', 'http://localhost:5173');
  return cookie ? req.set('Cookie', cookie) : req;
};
const get = (path: string, cookie?: string) => {
  const req = request(app).get(`/api/v1${path}`);
  return cookie ? req.set('Cookie', cookie) : req;
};
const checkout = (v = variantId) => ({
  items: [{ variantId: v, quantity: 1 }],
  name: 'Test customer',
  email: `${prefix}@example.test`,
  phone: '9800000000',
  fulfillment: 'PICKUP',
  address: {
    province: 'Bagmati',
    district: '',
    municipality: '',
    ward: '',
    area: '',
    landmark: '',
  },
  termsAccepted: true,
  idempotencyKey: randomUUID(),
});
beforeAll(async () => {
  if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.endsWith('_test'))
    throw new Error('Integration tests require a separate _test database.');
  const role = await db.role.create({ data: { name: `${prefix}-admin`, permissions: ['*'] } });
  async function session(name: string, roleId?: string) {
    const user = await db.user.create({
      data: {
        name,
        email: `${name}-${prefix}@example.test`,
        passwordHash: await bcrypt.hash('a-secure-test-password', 4),
        roleId,
      },
    });
    const raw = token();
    await db.userSession.create({
      data: { userId: user.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 3600000) },
    });
    return { cookie: `session=${raw}`, id: user.id };
  }
  const a = await session('customer'),
    b = await session('other'),
    c = await session('admin', role.id);
  customer = a.cookie;
  customerId = a.id;
  other = b.cookie;
  admin = c.cookie;
  const cat = await db.category.create({
    data: { slug: prefix, name: 'Test family', description: 'Test', image: 'phone' },
  });
  const store = await db.store.create({
    data: {
      slug: prefix,
      name: 'Test store',
      address: 'Test',
      hours: 'Test',
      phone: 'Not configured',
      services: [],
    },
  });
  const product = await db.product.create({
    data: {
      slug: prefix,
      name: 'Test phone',
      tagline: 'Test',
      description: 'Test',
      categoryId: cat.id,
      image: 'phone',
      gallery: [],
      specs: { Chip: 'Test' },
      variants: {
        create: [
          {
            sku: prefix,
            color: 'Black',
            colorHex: '#111111',
            storage: '256GB',
            price: 10000000,
            deposit: 1000000,
            preorder: true,
          },
          {
            sku: `${prefix}-limited`,
            color: 'White',
            colorHex: '#ffffff',
            storage: '512GB',
            price: 12000000,
            deposit: 1000000,
          },
        ],
      },
    },
    include: { variants: true },
  });
  variantId = product.variants[0].id;
  limitedVariant = product.variants[1].id;
  const stock = await db.inventoryStock.create({
    data: { variantId, storeId: store.id, available: 10 },
  });
  stockId = stock.id;
  await db.inventoryStock.create({
    data: { variantId: limitedVariant, storeId: store.id, available: 1 },
  });
  await db.tradeInRule.create({ data: { model: prefix, baseValue: 7000000 } });
});
afterAll(async () => {
  await db.$disconnect();
});
describe.sequential('connected device lifecycle and authorization', () => {
  it('rejects CSRF and backend admin access independently of UI', async () => {
    expect((await request(app).post('/api/v1/orders').send(checkout())).status).toBe(403);
    expect((await get('/admin/orders')).status).toBe(401);
    expect((await get('/admin/orders', customer)).status).toBe(403);
  });
  it('reserves stock with authoritative prices and a booking', async () => {
    const payload = checkout();
    const response = await write('post', '/orders', customer).send({ ...payload, total: 1 });
    expect(response.status).toBe(201);
    orderId = response.body.id;
    orderNumber = response.body.number;
    receiptKey = response.body.trackingToken;
    expect(response.body.total).toBe(10000000);
    expect(response.body.dueNow).toBe(1000000);
    expect(response.body.booking.status).toBe('PENDING_PAYMENT');
    const stock = await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } });
    expect(stock.available).toBe(9);
    expect(stock.reserved).toBe(1);
    expect((await write('post', '/orders', customer).send(payload)).status).toBe(409);
    expect(
      await db.inventoryLedger.count({ where: { reference: orderId, type: 'RESERVATION' } }),
    ).toBe(1);
  });
  it('protects order tracking with the private key', async () => {
    expect(
      (await write('post', '/tracking').send({ number: orderNumber, receiptKey: '0'.repeat(64) }))
        .status,
    ).toBe(404);
    const response = await write('post', '/tracking').send({ number: orderNumber, receiptKey });
    expect(response.status).toBe(200);
    expect(response.body.email).toBeUndefined();
    expect(response.body.phone).toBeUndefined();
    expect((await get('/account/orders', other)).body).toEqual([]);
  });
  it('never lets an unconfigured provider confirm payment', async () => {
    expect((await write('post', '/payments', customer).send({ orderId })).status).toBe(503);
    expect(
      (await write('post', '/payments/webhook/esewa').send({ orderId, status: 'success' })).status,
    ).toBe(503);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('PLACED');
  });
  it('prevents overselling the final unit under concurrent checkout', async () => {
    const results = await Promise.all([
      write('post', '/orders', customer).send(checkout(limitedVariant)),
      write('post', '/orders', other).send(checkout(limitedVariant)),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const stock = await db.inventoryStock.findFirstOrThrow({
      where: { variantId: limitedVariant },
    });
    expect(stock.available).toBe(0);
    expect(stock.reserved).toBe(1);
  });
  it('requires actual staff payment before handover and rejects overpayment', async () => {
    expect(
      (
        await write('post', `/admin/orders/${orderId}/fulfill`, admin).send({
          unitIds: ['invalid'],
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await write('post', `/admin/orders/${orderId}/collect`, customer).send({
          amount: 1000000,
          reference: 'forged-receipt',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await write('post', `/admin/orders/${orderId}/collect`, admin).send({
          amount: 10000001,
          reference: `${prefix}-overpay`,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await write('post', `/admin/orders/${orderId}/collect`, admin).send({
          amount: 1000000,
          reference: `${prefix}-deposit`,
        })
      ).status,
    ).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe(
      'DEPOSIT_PAID',
    );
    expect(
      (
        await write('post', `/admin/orders/${orderId}/collect`, admin).send({
          amount: 9000000,
          reference: `${prefix}-balance`,
        })
      ).status,
    ).toBe(200);
  });
  it('links the physical serial, paid order, warranty and owner', async () => {
    const unit = await write('post', '/admin/units', admin).send({
      variantId,
      serial: `${prefix.slice(-20)}-serial`,
    });
    expect(unit.status).toBe(201);
    expect(unit.body.serialHash).toBeUndefined();
    expect(
      (
        await write('post', `/admin/orders/${orderId}/allocate`, admin).send({
          unitIds: [unit.body.id],
        })
      ).status,
    ).toBe(200);
    expect((await db.booking.findUniqueOrThrow({ where: { orderId } })).status).toBe('ALLOCATED');
    const balance = await db.orderMoneyEntry.aggregate({
      where: { orderId },
      _sum: { amount: true },
    });
    expect(balance._sum.amount).toBe(0);
    expect(await db.orderMoneyEntry.count({ where: { orderId, kind: 'PAYMENT' } })).toBe(2);
    const result = await write('post', `/admin/orders/${orderId}/fulfill`, admin).send({
      unitIds: [unit.body.id],
    });
    expect(result.status).toBe(200);
    const devices = await get('/account/devices', customer);
    expect(devices.body).toHaveLength(1);
    deviceId = devices.body[0].id;
    expect(devices.body[0].unit.serialLast4).toBe('rial');
    expect(devices.body[0].orderId).toBe(orderId);
    expect((await get('/account/devices', other)).body).toEqual([]);
    const passport = await get(`/account/devices/${deviceId}/passport`, customer);
    expect(passport.status).toBe(200);
    expect(passport.body.canonicalId).toMatch(/^DEVICE-IB-/);
    expect(passport.body.events).toEqual(
      expect.arrayContaining([expect.objectContaining({ eventType: 'SOLD' })]),
    );
    expect(JSON.stringify(passport.body)).not.toContain('serialHash');
    expect((await get(`/account/devices/${deviceId}/passport`, other)).status).toBe(404);
    expect(
      (
        await write('post', `/admin/orders/${orderId}/fulfill`, admin).send({
          unitIds: [unit.body.id],
        })
      ).status,
    ).toBe(409);
  });
  it('connects repair to the owned device and rejects another owner', async () => {
    const data = {
      deviceId,
      model: 'Test phone',
      issue: 'Battery',
      description: 'The battery needs diagnosis.',
      method: 'STORE',
    };
    expect((await write('post', '/repairs', other).send(data)).status).toBe(404);
    const response = await write('post', '/repairs', customer).send(data);
    expect(response.status).toBe(201);
    repairId = response.body.id;
    for (const status of ['RECEIVED', 'INSPECTION', 'DIAGNOSIS'])
      expect(
        (
          await write('patch', `/admin/repairs/${repairId}/status`, admin).send({
            status,
            note: `Device is at ${status}`,
          })
        ).status,
      ).toBe(200);
  });
  it('creates a quote requiring immutable customer approval', async () => {
    const response = await write('post', `/admin/repairs/${repairId}/quote`, admin).send({
      diagnosis: 'The battery needs replacement.',
      parts: 800000,
      labor: 100000,
      warrantyDays: 90,
    });
    expect(response.status).toBe(201);
    quoteId = response.body.id;
    expect(response.body.total).toBe(900000);
    expect(
      (
        await write('post', `/repairs/${repairId}/quotes/${quoteId}/decision`, other).send({
          accept: true,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await write('post', `/repairs/${repairId}/quotes/${quoteId}/decision`, customer).send({
          accept: true,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await write('post', `/repairs/${repairId}/quotes/${quoteId}/decision`, customer).send({
          accept: false,
        })
      ).status,
    ).toBe(409);
    const quote = await db.repairQuote.findUniqueOrThrow({ where: { id: quoteId } });
    expect(quote.status).toBe('APPROVED');
    expect(quote.decidedAt).not.toBeNull();
  });
  it('completes a repair through valid service stages', async () => {
    expect(
      (
        await write('patch', `/admin/repairs/${repairId}/status`, admin).send({
          status: 'COMPLETED',
          note: 'Skip all steps',
        })
      ).status,
    ).toBe(409);
    for (const status of ['REPAIR_IN_PROGRESS', 'QUALITY_CONTROL', 'READY', 'COMPLETED']) {
      if (status === 'READY') {
        expect(
          (
            await write('patch', `/admin/repairs/${repairId}/status`, admin).send({
              status,
              note: 'Cannot bypass QC',
            })
          ).status,
        ).toBe(409);
        const qc = await write('post', `/admin/repairs/${repairId}/qc`, admin).send({
          checks: qcChecks.map((name) => ({ name, passed: true })),
          notes: 'All functional checks passed.',
        });
        expect(qc.status).toBe(201);
      }
      expect(
        (
          await write('patch', `/admin/repairs/${repairId}/status`, admin).send({
            status,
            note: `Device is at ${status}`,
          })
        ).status,
      ).toBe(200);
    }
    expect(await db.repairWarranty.findUnique({ where: { repairId } })).not.toBeNull();
    const response = await get('/account/devices', customer);
    expect(response.body[0].repairs[0].id).toBe(repairId);
  });
  it('trades the same owned device into the next purchase exactly once', async () => {
    const trade = await write('post', '/trade-ins', customer).send({
      model: prefix,
      storage: '256GB',
      condition: 'Good',
      battery: 90,
      functional: true,
      deviceId,
      kind: 'EXCHANGE',
      estimate: 999999999,
    });
    expect(trade.status).toBe(201);
    tradeInId = trade.body.id;
    expect(trade.body.estimate).toBe(5950000);
    expect(
      (
        await write('patch', `/admin/trade-ins/${tradeInId}/inspect`, admin).send({
          finalValue: 5500000,
          reason: 'Battery wear observed during physical inspection.',
        })
      ).status,
    ).toBe(200);
    expect(
      (await write('post', `/trade-ins/${tradeInId}/decision`, customer).send({ accept: true }))
        .status,
    ).toBe(200);
    const next = await write('post', '/orders', customer).send({ ...checkout(), tradeInId });
    expect(next.status).toBe(201);
    expect(next.body.total).toBe(4500000);
    expect(
      (
        await db.orderMoneyEntry.aggregate({
          where: { orderId: next.body.id },
          _sum: { amount: true },
        })
      )._sum.amount,
    ).toBe(4500000);
    expect(
      await db.orderMoneyEntry.count({ where: { orderId: next.body.id, kind: 'TRADE_IN_CREDIT' } }),
    ).toBe(1);
    expect(
      (await write('post', '/orders', customer).send({ ...checkout(), tradeInId })).status,
    ).toBe(409);
  });
  it('expires stale reservations and releases their stock only once', async () => {
    const response = await write('post', '/orders', customer).send(checkout());
    expect(response.status).toBe(201);
    await db.order.update({
      where: { id: response.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const before = await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } });
    await expireReservations();
    await expireReservations();
    const after = await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } });
    expect(after.available).toBe(before.available + 1);
    expect(after.reserved).toBe(before.reserved - 1);
    expect(
      (
        await db.orderMoneyEntry.aggregate({
          where: { orderId: response.body.id },
          _sum: { amount: true },
        })
      )._sum.amount,
    ).toBe(0);
    expect(
      await db.orderMoneyEntry.count({ where: { orderId: response.body.id, kind: 'VOID' } }),
    ).toBe(1);
  });
  it('keeps staff-only notes out of customer tickets', async () => {
    const ticket = await write('post', '/account/tickets', customer).send({
      subject: 'Warranty question',
      message: 'Please help me with my warranty.',
    });
    expect(
      (
        await write('post', `/admin/tickets/${ticket.body.id}/messages`, admin).send({
          body: 'Private operational note',
          internal: true,
        })
      ).status,
    ).toBe(201);
    const response = await get('/account/tickets', customer);
    expect(JSON.stringify(response.body)).not.toContain('Private operational note');
  });
  it('records policy acceptance and handles a fully credited exchange without a fake cash payment', async () => {
    const policy = await db.policyAcceptance.findUnique({ where: { orderId } });
    expect(policy?.acceptedAt).toBeInstanceOf(Date);
    const trade = await db.tradeIn.create({
      data: {
        userId: customerId,
        model: prefix,
        storage: '256GB',
        condition: 'Good',
        answers: {},
        estimate: 10000000,
        finalValue: 10000000,
        status: 'ACCEPTED',
      },
    });
    const response = await write('post', '/orders', customer).send({
      ...checkout(),
      tradeInId: trade.id,
    });
    expect(response.status).toBe(201);
    expect(response.body.total).toBe(0);
    expect(response.body.status).toBe('PAID');
    const payment = await db.payment.findFirstOrThrow({ where: { orderId: response.body.id } });
    expect(payment.provider).toBe('TRADE_IN');
    expect(payment.amount).toBe(0);
    expect(payment.status).toBe('CONFIRMED');
  });
  it('audits sensitive staff and customer decisions', async () => {
    expect(await db.auditLog.count({ where: { entityId: orderId } })).toBeGreaterThanOrEqual(3);
    expect(
      await db.auditLog.count({ where: { entityId: quoteId, action: 'repair.quote.decision' } }),
    ).toBe(1);
  });
  it('keeps financial entries immutable and reconciles actual recorded receipts', async () => {
    const entry = await db.orderMoneyEntry.findFirstOrThrow({ where: { orderId } });
    await expect(
      db.orderMoneyEntry.update({ where: { id: entry.id }, data: { amount: 1 } }),
    ).rejects.toThrow();
    expect((await get('/admin/reconciliation', customer)).status).toBe(403);
    const result = await get('/admin/reconciliation', admin);
    expect(result.status).toBe(200);
    expect(result.body.rows.find((row: { id: string }) => row.id === orderId)?.status).toBe(
      'MATCHED',
    );
  });
});
