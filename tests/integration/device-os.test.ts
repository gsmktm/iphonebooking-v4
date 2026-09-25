import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { app } from '../../apps/api/server/app';
import { db } from '../../apps/api/server/db';
import { hash, token } from '../../apps/api/server/core';
import { scaffoldPaths } from '../../apps/api/server/routes/legacy-scaffolds';
import { qcChecks } from '../../apps/api/server/services/repair-quality';

const prefix = `device-os-${randomUUID()}`;
let admin: string,
  customer: string,
  adminId: string,
  userId: string,
  productId: string,
  variantId: string,
  stockId: string,
  unitId: string,
  identityId: string,
  repairId: string,
  partId: string;
function call(method: 'get' | 'post' | 'patch' | 'delete' | 'put', path: string, cookie?: string) {
  const req = request(app)[method](`/api/v1${path}`).set('X-Requested-With', 'iPhoneBooking');
  return cookie ? req.set('Cookie', cookie) : req;
}
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
    throw new Error('Use an isolated test database.');
  const role = await db.role.create({ data: { name: prefix, permissions: ['*'] } });
  async function session(staff: boolean) {
    const user = await db.user.create({
      data: {
        name: 'Device OS fixture',
        email: `${prefix}-${staff}@example.test`,
        passwordHash: 'unused-test-fixture',
        roleId: staff ? role.id : undefined,
      },
    });
    const raw = token();
    await db.userSession.create({
      data: { userId: user.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 3600000) },
    });
    return { cookie: `session=${raw}`, id: user.id };
  }
  const a = await session(true),
    c = await session(false);
  admin = a.cookie;
  adminId = a.id;
  customer = c.cookie;
  userId = c.id;
  const category = await db.category.create({
    data: { slug: prefix, name: 'Fixture', description: 'Fixture', image: 'phone' },
  });
  const product = await db.product.create({
    data: {
      slug: prefix,
      name: 'Device OS fixture',
      tagline: 'Fixture',
      description: 'Fixture',
      categoryId: category.id,
      image: 'phone',
      gallery: [],
      specs: {},
    },
  });
  productId = product.id;
  const variant = await db.productVariant.create({
    data: {
      productId,
      sku: prefix,
      color: 'Black',
      colorHex: '#000000',
      storage: '256GB',
      price: 100000,
      deposit: 10000,
    },
  });
  variantId = variant.id;
  const store = await db.store.create({
    data: {
      slug: prefix,
      name: 'Fixture store',
      address: 'Fixture',
      hours: 'Fixture',
      phone: 'Fixture',
      services: [],
    },
  });
  const stock = await db.inventoryStock.create({
    data: { variantId, storeId: store.id, available: 3 },
  });
  stockId = stock.id;
});
afterAll(() => db.$disconnect());
describe.sequential('Device OS domain integrity', () => {
  it('keeps products without configurations and unpublished accessories out of public detail pages', async () => {
    const source = await db.product.findUniqueOrThrow({ where: { id: productId } });
    const incomplete = await db.product.create({
      data: {
        name: 'Incomplete fixture',
        slug: `${prefix}-incomplete`,
        tagline: '',
        description: '',
        categoryId: source.categoryId,
        image: 'phone',
        specs: {},
        gallery: [],
      },
    });
    expect((await call('get', `/products/${incomplete.slug}`)).status).toBe(404);
    await db.accessoryCompatibility.create({
      data: { deviceId: productId, accessoryId: incomplete.id },
    });
    expect((await call('get', `/products/${prefix}`)).body.accessories).toEqual([]);
    await db.productVariant.create({
      data: {
        productId: incomplete.id,
        sku: `${prefix}-accessory`,
        color: 'Black',
        colorHex: '#000000',
        storage: 'Standard',
        price: 10000,
        deposit: 0,
      },
    });
    expect((await call('get', `/products/${prefix}`)).body.accessories).toHaveLength(1);
    await db.product.update({ where: { id: incomplete.id }, data: { active: false } });
    expect((await call('get', `/products/${prefix}`)).body.accessories).toEqual([]);
  });
  it('denies anonymous access to every generated V3 router', async () => {
    for (const path of scaffoldPaths) {
      const r = await call('post', `/${path}`).send({ status: 'APPROVED', amountNPR: 1 });
      expect(r.status, path).toBe(401);
    }
    expect((await call('get', '/financialLedger/list', customer)).status).toBe(403);
    expect((await call('post', '/deviceEvent', admin).send({})).status).toBe(501);
    expect((await call('get', '/admin/integration-config', admin)).status).toBe(501);
  });
  it('registers received quantities with one masked canonical identity and an audited event', async () => {
    expect(
      (
        await call('post', '/admin/units', admin).send({
          variantId,
          stockId,
          serial: prefix.slice(-36),
          status: 'SOLD',
        })
      ).status,
    ).toBe(422);
    const r = await call('post', '/admin/units', admin).send({
      variantId,
      stockId,
      serial: prefix.slice(-36),
    });
    expect(r.status).toBe(201);
    unitId = r.body.id;
    expect(r.body.canonicalId).toMatch(/^DEVICE-IB-/);
    expect(r.body.serialHash).toBeUndefined();
    const identity = await db.deviceIdentity.findUniqueOrThrow({ where: { unitId } });
    identityId = identity.id;
    expect(
      await db.deviceEvent.count({ where: { deviceId: identityId, eventType: 'RECEIVED' } }),
    ).toBe(1);
    expect(
      (
        await call('post', '/admin/units', admin).send({
          variantId,
          stockId,
          serial: prefix.slice(-36),
        })
      ).status,
    ).toBe(409);
    const list = await call('get', '/admin/device-identity', admin);
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toContain('primarySerial');
    expect(JSON.stringify(list.body)).not.toContain('serialHash');
  });
  it('generates distinct canonical numbers inside a single transaction', async () => {
    const identities = await db.$transaction(async (tx) => [
      await tx.deviceIdentity.create({ data: {} }),
      await tx.deviceIdentity.create({ data: {} }),
    ]);
    expect(identities[0].canonicalId).not.toBe(identities[1].canonicalId);
  });
  it('rejects database rewriting or deleting of device event history', async () => {
    const event = await db.deviceEvent.findFirstOrThrow({ where: { deviceId: identityId } });
    await expect(
      db.deviceEvent.update({ where: { id: event.id }, data: { eventType: 'FORGED' } }),
    ).rejects.toThrow();
    await expect(db.deviceEvent.delete({ where: { id: event.id } })).rejects.toThrow();
    expect((await db.deviceEvent.findUniqueOrThrow({ where: { id: event.id } })).eventType).toBe(
      'RECEIVED',
    );
  });
  it('requires the physical unit to be at the reserved location', async () => {
    const store = await db.store.create({
      data: {
        slug: `${prefix}-other`,
        name: 'Other fixture store',
        address: 'Fixture',
        hours: 'Fixture',
        phone: 'Fixture',
        services: [],
      },
    });
    const otherStock = await db.inventoryStock.create({
      data: { variantId, storeId: store.id, available: 0, reserved: 1 },
    });
    const order = await db.order.create({
      data: {
        number: `${prefix}-order`,
        userId,
        email: `${prefix}@example.test`,
        name: 'Fixture',
        phone: '9800000000',
        address: {},
        fulfillment: 'PICKUP',
        status: 'PAID',
        total: 100000,
        dueNow: 100000,
        trackingHash: hash(token()),
        idempotencyKey: randomUUID(),
        expiresAt: new Date(Date.now() + 3600000),
        items: { create: { variantId, quantity: 1, unitPrice: 100000, stockId: otherStock.id } },
      },
    });
    const r = await call('post', `/admin/orders/${order.id}/allocate`, admin).send({
      unitIds: [unitId],
    });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('UNIT_LOCATION_MISMATCH');
    const device = await db.device.create({
      data: { userId, unitId, orderId: order.id, warrantyUntil: new Date(Date.now() + 86400000) },
    });
    const repair = await db.repair.create({
      data: {
        userId,
        deviceId: device.id,
        model: 'Fixture phone',
        issue: 'Battery',
        description: 'Fixture repair',
        method: 'STORE',
        status: 'REPAIR_IN_PROGRESS',
      },
    });
    repairId = repair.id;
  });
  it('consumes compatible parts exactly once with cost and prevents negative stock', async () => {
    const p = await call('post', '/admin/parts', admin).send({
      sku: prefix,
      name: 'Fixture battery',
      cost: 400,
      productIds: [productId],
    });
    expect(p.status).toBe(201);
    partId = p.body.id;
    const receipt = { quantity: 1, unitCost: 500, reference: `${prefix}-receipt` };
    expect((await call('post', `/admin/parts/${partId}/receive`, admin).send(receipt)).status).toBe(
      201,
    );
    expect((await call('post', `/admin/parts/${partId}/receive`, admin).send(receipt)).status).toBe(
      409,
    );
    const results = await Promise.all(
      [1, 2].map((n) =>
        call('post', `/admin/repairs/${repairId}/parts`, admin).send({
          partId,
          quantity: 1,
          reference: `${prefix}-use-${n}`,
        }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await db.part.findUniqueOrThrow({ where: { id: partId } })).stock).toBe(0);
    const consumed = await db.partMovement.findFirstOrThrow({
      where: { partId, type: 'CONSUMED' },
    });
    expect(consumed.unitCost).toBe(500);
    expect(consumed.quantity).toBe(-1);
    await expect(db.partMovement.delete({ where: { id: consumed.id } })).rejects.toThrow();
  });
  it('requires a fresh complete QC pass after rework', async () => {
    expect(
      (
        await call('patch', `/admin/repairs/${repairId}/status`, admin).send({
          status: 'QUALITY_CONTROL',
          note: 'Functional testing begins',
        })
      ).status,
    ).toBe(200);
    const checks = qcChecks.map((name) => ({ name, passed: true }));
    expect(
      (await call('post', `/admin/repairs/${repairId}/qc`, customer).send({ checks })).status,
    ).toBe(403);
    expect(
      (
        await call('post', `/admin/repairs/${repairId}/qc`, admin).send({
          checks: Array.from({ length: checks.length }, () => checks[0]),
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call('post', `/admin/repairs/${repairId}/qc`, admin).send({
          checks: checks.map((c, i) => ({ ...c, passed: i !== 0 })),
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await call('patch', `/admin/repairs/${repairId}/status`, admin).send({
          status: 'READY',
          note: 'Attempt with failed QC',
        })
      ).status,
    ).toBe(409);
    expect(
      (await call('post', `/admin/repairs/${repairId}/qc`, admin).send({ checks })).status,
    ).toBe(201);
    for (const status of ['REPAIR_IN_PROGRESS', 'QUALITY_CONTROL'])
      expect(
        (
          await call('patch', `/admin/repairs/${repairId}/status`, admin).send({
            status,
            note: 'New repair cycle',
          })
        ).status,
      ).toBe(200);
    expect(
      (
        await call('patch', `/admin/repairs/${repairId}/status`, admin).send({
          status: 'READY',
          note: 'Attempt to reuse old QC',
        })
      ).status,
    ).toBe(409);
  });
  it('receives approved supplier devices without selling them before QC', async () => {
    const supplier = await call('post', '/admin/suppliers', admin).send({
      name: `Supplier ${prefix}`,
    });
    expect(supplier.status).toBe(201);
    const purchase = await call('post', '/admin/purchase-orders', admin).send({
      supplierId: supplier.body.id,
      items: [{ variantId, quantity: 1, unitCost: 70000 }],
    });
    expect(purchase.status).toBe(201);
    const poId = purchase.body.id;
    const receipt = {
      reference: `${prefix}-grn`,
      storeId: (await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } })).storeId,
      units: [{ variantId, serial: `${prefix.slice(-25)}-po` }],
    };
    expect(
      (await call('post', `/admin/purchase-orders/${poId}/receive`, admin).send(receipt)).status,
    ).toBe(409);
    expect(
      (
        await call('post', `/admin/purchase-orders/${poId}/approve`, admin).send({
          reason: 'Commercial terms reviewed.',
        })
      ).status,
    ).toBe(409);
    const staff = await db.user.create({
      data: {
        email: `approver-${prefix}@example.test`,
        name: 'Independent approver',
        passwordHash: 'unused-test-fixture',
        roleId: (await db.user.findUniqueOrThrow({ where: { id: adminId } })).roleId,
      },
    });
    const raw = token();
    await db.userSession.create({
      data: { userId: staff.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 3600000) },
    });
    expect(
      (
        await call('post', `/admin/purchase-orders/${poId}/approve`, `session=${raw}`).send({
          reason: 'Commercial terms independently reviewed.',
        })
      ).status,
    ).toBe(200);
    const before = await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } });
    const grn = await call('post', `/admin/purchase-orders/${poId}/receive`, admin).send(receipt);
    expect(grn.status).toBe(201);
    expect((await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } })).available).toBe(
      before.available,
    );
    const unit = await db.inventoryUnit.findFirstOrThrow({
      where: { grnId: grn.body.id },
      include: { identity: { include: { provenance: true } } },
    });
    expect(unit.status).toBe('QC_PENDING');
    expect(unit.cost).toBe(70000);
    expect(unit.identity?.provenance[0].purchaseOrder).toBe(poId);
    expect(
      (await call('post', `/admin/purchase-orders/${poId}/receive`, admin).send(receipt)).status,
    ).toBe(409);
    expect(
      (
        await call('post', `/admin/receipts/${grn.body.id}/qc`, admin).send({
          passed: true,
          notes: 'All receiving checks passed.',
        })
      ).status,
    ).toBe(200);
    expect((await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } })).available).toBe(
      before.available + 1,
    );
    expect(
      (
        await call('post', `/admin/receipts/${grn.body.id}/qc`, admin).send({
          passed: true,
          notes: 'Do not duplicate the receipt.',
        })
      ).status,
    ).toBe(409);
    expect(
      await db.inventoryLedger.count({ where: { reference: `grn:${grn.body.id}:${unit.id}` } }),
    ).toBe(1);
  });
  it('does not report CLEAR when external registry data is unavailable', async () => {
    const r = await call('post', `/admin/device-identity/${identityId}/risk-check`, admin).send({});
    expect(r.status).toBe(201);
    expect(r.body.result).toBe('UNKNOWN');
    expect((await db.deviceRiskCheck.findUniqueOrThrow({ where: { id: r.body.id } })).result).toBe(
      'UNKNOWN',
    );
  });
  it('prevents delegated role managers from granting or editing higher privileges', async () => {
    const created = await call('post', '/admin/roles', admin).send({
      name: `${prefix}-delegated`,
      permissions: ['role.read', 'role.manage'],
    });
    expect(created.status).toBe(201);
    const manager = await db.user.create({
      data: {
        email: `manager-${prefix}@example.test`,
        name: 'Delegated manager fixture',
        passwordHash: 'unused-test-fixture',
        roleId: created.body.id,
      },
    });
    const raw = token();
    await db.userSession.create({
      data: { userId: manager.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 3600000) },
    });
    const managerCookie = `session=${raw}`;
    expect(
      (
        await call('post', '/admin/roles', managerCookie).send({
          name: `${prefix}-escalation`,
          permissions: ['payment.collect'],
        })
      ).status,
    ).toBe(403);
    const superRole = (await db.user.findUniqueOrThrow({ where: { id: adminId } })).roleId;
    expect(
      (
        await call('patch', `/admin/customers/${userId}/role`, managerCookie).send({
          roleId: superRole,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call('patch', `/admin/roles/${created.body.id}`, managerCookie).send({
          name: 'Own role change',
          permissions: ['role.read'],
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await call('patch', `/admin/roles/${created.body.id}`, admin).send({
          name: `${prefix}-limited`,
          permissions: ['role.read'],
        })
      ).status,
    ).toBe(200);
    expect((await call('get', '/admin/roles', managerCookie)).status).toBe(401);
  });
  it('syncs account-scoped cart and wishlist with revision conflict protection', async () => {
    const saved = await call('get', '/account/shop-state', customer);
    expect(saved.status).toBe(200);
    expect(saved.body.accountId).toBe(userId);
    const data = {
      accountId: userId,
      revision: saved.body.revision,
      cart: [{ variantId, quantity: 1 }],
      wishlist: [productId],
    };
    expect(
      (await call('put', '/account/shop-state', customer).send({ ...data, accountId: adminId }))
        .status,
    ).toBe(409);
    const writes = await Promise.all([
      call('put', '/account/shop-state', customer).send(data),
      call('put', '/account/shop-state', customer).send({ ...data, cart: [] }),
    ]);
    expect(writes.map((r) => r.status).sort()).toEqual([200, 409]);
    const next = await call('get', '/account/shop-state', customer);
    expect(next.body.revision).toBe(data.revision + 1);
    expect(next.body.wishlist).toEqual([productId]);
    expect(
      (await call('put', '/account/shop-state', customer).send({ ...data, cart: [], wishlist: [] }))
        .status,
    ).toBe(409);
    expect((await call('get', '/account/shop-state', admin)).body.wishlist).toEqual([]);
    expect((await call('post', '/account/wishlist', customer).send({ productId })).status).toBe(
      200,
    );
    expect((await call('get', '/account/shop-state', customer)).body.revision).toBe(
      next.body.revision + 1,
    );
  });
});
