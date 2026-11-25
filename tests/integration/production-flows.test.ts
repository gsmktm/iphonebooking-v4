import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { randomUUID, createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { app } from '../../apps/api/server/app';
import { db } from '../../apps/api/server/db';
import { hash, token } from '../../apps/api/server/core';
import { initiatePayment, verifyPayment } from '../../apps/api/server/services/payments';
import { expireReservations } from '../../apps/api/server/services/orders';
import { deliverAccountEmail } from '../../apps/api/server/services/account-recovery';
import { passesImeiChecksum } from '../../apps/api/server/routes/information';
import type { PaymentProvider } from '../../apps/api/server/services/khalti';
const prefix = `release-${randomUUID()}`;
let userId: string,
  customer: string,
  otherId: string,
  other: string,
  staff: string,
  variantId: string,
  stockId: string,
  storeId: string,
  productId: string;
const write = (path: string, body: object, cookie?: string) => {
  const req = request(app)
    .post(`/api/v1${path}`)
    .set('X-Requested-With', 'iPhoneBooking')
    .set('Origin', 'http://localhost:5173')
    .send(body);
  return cookie ? req.set('Cookie', cookie) : req;
};
const get = (path: string, cookie?: string) => {
  const req = request(app).get(`/api/v1${path}`);
  return cookie ? req.set('Cookie', cookie) : req;
};
const checkout = () => ({
  items: [{ variantId, quantity: 1 }],
  name: 'Release test',
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
  idempotencyKey: randomUUID(),
  termsAccepted: true,
});
async function identity(name: string, roleId?: string) {
  const u = await db.user.create({
    data: {
      name,
      email: `${prefix}-${name}@example.test`,
      passwordHash: await bcrypt.hash('Original-test-password', 4),
      roleId,
    },
  });
  const raw = token();
  await db.userSession.create({
    data: { userId: u.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 3600000) },
  });
  return { id: u.id, cookie: `session=${raw}` };
}
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
    throw Error('Isolated test database required.');
  const role = await db.role.create({ data: { name: `${prefix}-admin`, permissions: ['*'] } });
  const a = await identity('customer'),
    b = await identity('other'),
    c = await identity('staff', role.id);
  userId = a.id;
  customer = a.cookie;
  otherId = b.id;
  other = b.cookie;
  staff = c.cookie;
  const category = await db.category.create({
    data: { name: prefix, slug: prefix, description: 'Test', image: 'phone' },
  });
  const product = await db.product.create({
    data: {
      name: prefix,
      slug: prefix,
      tagline: 'Test device',
      description: 'Test catalog',
      categoryId: category.id,
      image: 'phone',
      gallery: [],
      specs: {},
    },
  });
  productId = product.id;
  const v = await db.productVariant.create({
    data: {
      productId: product.id,
      sku: prefix,
      color: 'Release gold',
      colorHex: '#ccb07c',
      storage: '256GB',
      price: 200000,
      deposit: 50000,
      preorder: false,
    },
  });
  variantId = v.id;
  const store = await db.store.create({
    data: {
      name: prefix,
      slug: prefix,
      address: 'Test store',
      hours: 'Test hours',
      phone: '9800000000',
      services: ['PICKUP'],
    },
  });
  storeId = store.id;
  const stock = await db.inventoryStock.create({ data: { variantId, storeId, available: 50 } });
  stockId = stock.id;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await db.$disconnect();
});
describe('authoritative reservation and payment flow', () => {
  it('quotes real money, detects price changes, and replays lost-response reservations privately', async () => {
    const q = await write(
      '/checkout/quote',
      { items: [{ variantId, quantity: 1 }], total: 1 },
      customer,
    );
    expect(q.status).toBe(200);
    expect(q.body.total).toBe(200000);
    const input = {
      ...checkout(),
      expectedQuote: q.body.fingerprint,
      receiptKey: token(),
      total: 1,
    };
    await db.productVariant.update({ where: { id: variantId }, data: { price: 210000 } });
    const stale = await write('/orders', input, customer);
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('QUOTE_CHANGED');
    expect((await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } })).available).toBe(
      50,
    );
    await db.productVariant.update({ where: { id: variantId }, data: { price: 200000 } });
    const first = await write('/orders', input, customer);
    expect(first.status).toBe(201);
    expect(first.body.total).toBe(200000);
    expect(first.body.trackingToken).toBe(input.receiptKey);
    const replay = await write('/orders', input, customer);
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(first.body.id);
    expect((await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } })).available).toBe(
      49,
    );
    expect((await write('/orders', { ...input, receiptKey: token() }, customer)).status).toBe(409);
    expect((await write('/payments/status', { orderId: first.body.id }, other)).status).toBe(404);
    expect(
      (await write('/payments/status', { orderId: first.body.id, receiptKey: input.receiptKey }))
        .status,
    ).toBe(200);
  });
  it('verifies against the provider once, records one ledger entry, and blocks competing store collection', async () => {
    const created = await write('/orders', checkout(), customer);
    expect(created.status).toBe(201);
    const provider: PaymentProvider = {
      name: 'KHALTI',
      createPayment: vi.fn(async () => ({
        reference: `pidx-${randomUUID()}`,
        url: 'https://test-pay.khalti.com/test',
        expiresAt: new Date(Date.now() + 3600000),
      })),
      verifyPayment: vi.fn(async (reference) => ({
        reference,
        transactionId: `txn-${prefix}`,
        amount: 200000,
        currency: 'NPR' as const,
        status: 'COMPLETED' as const,
      })),
    };
    const key = randomUUID();
    const payment = await initiatePayment(created.body.id, key, provider);
    const same = await initiatePayment(created.body.id, key, provider);
    expect(same.id).toBe(payment.id);
    expect(provider.createPayment).toHaveBeenCalledTimes(1);
    const competing = await write(
      `/admin/orders/${created.body.id}/collect`,
      { amount: 200000, reference: `receipt-${prefix}` },
      staff,
    );
    expect(competing.status).toBe(409);
    expect(competing.body.error.code).toBe('ONLINE_PAYMENT_PENDING');
    const verified = await verifyPayment(payment.id, provider);
    expect(verified.status).toBe('CONFIRMED');
    await verifyPayment(payment.id, provider);
    expect(provider.verifyPayment).toHaveBeenCalledTimes(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: created.body.id } })).status).toBe(
      'PAID',
    );
    expect(await db.orderMoneyEntry.count({ where: { paymentId: payment.id } })).toBe(1);
  });
  it('never marks mismatched evidence paid and keeps unresolved stock reserved through expiry', async () => {
    const created = await write('/orders', checkout(), customer);
    expect(created.status).toBe(201);
    const provider: PaymentProvider = {
      name: 'KHALTI',
      createPayment: async () => ({
        reference: `bad-${randomUUID()}`,
        url: 'https://test-pay.khalti.com/test',
        expiresAt: new Date(Date.now() + 3600000),
      }),
      verifyPayment: async (reference) => ({
        reference,
        transactionId: `bad-txn-${prefix}`,
        amount: 1,
        currency: 'NPR' as const,
        status: 'COMPLETED' as const,
      }),
    };
    const payment = await initiatePayment(created.body.id, randomUUID(), provider);
    expect((await verifyPayment(payment.id, provider)).status).toBe('REVIEW_REQUIRED');
    await db.order.update({
      where: { id: created.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expireReservations();
    expect((await db.order.findUniqueOrThrow({ where: { id: created.body.id } })).status).toBe(
      'PLACED',
    );
    expect(await db.orderMoneyEntry.count({ where: { paymentId: payment.id } })).toBe(0);
  });
  it('cannot access retailer or staff tools without authorization', async () => {
    expect((await get('/admin/retailer-applications')).status).toBe(401);
    expect((await get('/admin/price-intelligence', customer)).status).toBe(403);
    expect((await get('/retailer/memberships')).status).toBe(401);
  });
});
describe('account recovery', () => {
  it('fails explicitly without email configuration and keeps a consistent response for unknown accounts', async () => {
    vi.stubEnv('MAIL_PROVIDER', 'unconfigured');
    expect((await write('/auth/forgot-password', { email: 'nobody@example.test' })).status).toBe(
      503,
    );
    vi.stubEnv('MAIL_PROVIDER', 'resend');
    vi.stubEnv('MAIL_FROM', 'test@example.test');
    vi.stubEnv('RESEND_API_KEY', 'test-provider-key');
    vi.stubEnv('AUTH_EMAIL_SECRET', 'a-test-only-signing-secret-at-least-32-characters');
    vi.stubEnv('APP_ORIGIN', 'http://localhost:5173');
    const known = await write('/auth/forgot-password', {
      email: `${prefix}-customer@example.test`,
    });
    const unknown = await write('/auth/forgot-password', {
      email: `unknown-${prefix}@example.test`,
    });
    expect(known.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
    expect(known.body).not.toHaveProperty('token');
    const record = await db.accountToken.findFirstOrThrow({
      where: { userId, purpose: 'PASSWORD_RESET' },
      orderBy: { createdAt: 'desc' },
    });
    const raw = createHmac('sha256', process.env.AUTH_EMAIL_SECRET!)
      .update(`iphonebooking:account:v1:PASSWORD_RESET:${record.requestKey}`)
      .digest('hex');
    expect(record.tokenHash).toBe(hash(raw));
    const sender = vi.fn(
      async () => new Response(JSON.stringify({ id: 'test-message' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', sender);
    await deliverAccountEmail({ accountTokenId: record.id });
    await deliverAccountEmail({ accountTokenId: record.id });
    expect(sender).toHaveBeenCalledTimes(1);
    const reset = await write('/auth/reset-password', {
      token: raw,
      newPassword: 'Changed-test-password-strong',
    });
    expect(reset.status).toBe(200);
    expect((await get('/auth/me', customer)).body).toBeNull();
    expect(
      (
        await write('/auth/reset-password', {
          token: raw,
          newPassword: 'Another-test-password-strong',
        })
      ).status,
    ).toBe(400);
    const login = await write('/auth/login', {
      email: `${prefix}-customer@example.test`,
      password: 'Changed-test-password-strong',
    });
    expect(login.status).toBe(200);
    customer = login.headers['set-cookie'][0].split(';')[0];
    vi.unstubAllGlobals();
  });
  it('rejects expired tokens, blocks suspended sessions, and verifies email only once', async () => {
    const expired = token();
    await db.accountToken.create({
      data: {
        userId: otherId,
        purpose: 'PASSWORD_RESET',
        tokenHash: hash(expired),
        requestKey: token(),
        email: `${prefix}-other@example.test`,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    expect(
      (
        await write('/auth/reset-password', {
          token: expired,
          newPassword: 'Another-test-password-strong',
        })
      ).status,
    ).toBe(400);
    const raw = token();
    await db.accountToken.create({
      data: {
        userId: otherId,
        purpose: 'EMAIL_VERIFICATION',
        tokenHash: hash(raw),
        requestKey: token(),
        email: `${prefix}-other@example.test`,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    expect((await write('/auth/verify-email', { token: raw })).status).toBe(200);
    expect((await write('/auth/verify-email', { token: raw })).status).toBe(400);
    await db.user.update({ where: { id: otherId }, data: { status: 'SUSPENDED' } });
    expect((await get('/auth/me', other)).body).toBeNull();
    expect(
      (
        await write('/auth/login', {
          email: `${prefix}-other@example.test`,
          password: 'Original-test-password',
        })
      ).status,
    ).toBe(401);
    await db.user.update({ where: { id: otherId }, data: { status: 'ACTIVE' } });
  });
});
describe('retailer isolation and public discovery', () => {
  it('reviews real applications, scopes store access, and enforces role and stock protections', async () => {
    const apply = await write(
      '/retailer-applications',
      {
        businessName: 'Test retail business',
        contactName: 'Test operator',
        contactPhone: '9800000000',
        city: 'Kathmandu',
        address: 'Test retail address',
        note: 'Test application with enough business context.',
      },
      customer,
    );
    expect(apply.status).toBe(201);
    const review = await write(
      `/admin/retailer-applications/${apply.body.id}/review`,
      {
        decision: 'APPROVED',
        code: `T-${randomUUID().slice(0, 8)}`,
        reviewNote: 'Approved for isolated testing.',
        storeIds: [storeId],
      },
      staff,
    );
    expect(review.status).toBe(200);
    const tenant = review.body.retailerId;
    expect((await get(`/retailer/${tenant}/inventory`, other)).status).toBe(403);
    const inventory = await get(`/retailer/${tenant}/inventory`, customer);
    expect(inventory.status).toBe(200);
    expect(inventory.body.items[0].id).toBe(stockId);
    const privateOrders = await get(`/retailer/${tenant}/orders`, customer);
    expect(privateOrders.body.items).toEqual([]); // orders from before store assignment stay private
    const newOrder = await write('/orders', checkout(), customer);
    expect(newOrder.status).toBe(201);
    const visible = await get(`/retailer/${tenant}/orders`, customer);
    expect(visible.body.items.some((o: { id: string }) => o.id === newOrder.body.id)).toBe(true);
    expect(visible.body.items[0]).not.toHaveProperty('email');
    expect(visible.body.items[0]).not.toHaveProperty('total');
    const membership = await write(
      `/retailer/${tenant}/members`,
      { email: `${prefix}-other@example.test`, role: 'VIEWER' },
      customer,
    );
    expect(membership.status).toBe(201);
    const available = (await db.inventoryStock.findUniqueOrThrow({ where: { id: stockId } }))
      .available;
    const adjustment = {
      quantity: 2,
      expectedAvailable: available,
      reason: 'Documented test stock receipt',
      idempotencyKey: randomUUID(),
    };
    expect(
      (await write(`/retailer/${tenant}/inventory/${stockId}/adjust`, adjustment, other)).status,
    ).toBe(403);
    expect(
      (await write(`/retailer/${tenant}/inventory/${stockId}/adjust`, adjustment, customer)).status,
    ).toBe(200);
    expect(
      (await write(`/retailer/${tenant}/inventory/${stockId}/adjust`, adjustment, customer)).body
        .replayed,
    ).toBe(true);
    const foreign = await db.retailer.create({
      data: { name: 'Other tenant', code: `X-${randomUUID().slice(0, 8)}` },
    });
    expect((await get(`/retailer/${foreign.id}/orders`, customer)).status).toBe(403);
  });
  it('filters a matching real variant and protects unpublished market research', async () => {
    const catalog = await get(
      `/catalog?q=${encodeURIComponent(prefix)}&storage=256GB&color=Release%20gold`,
    );
    expect(catalog.status).toBe(200);
    expect(catalog.body.products.some((p: { id: string }) => p.id === productId)).toBe(true);
    const mismatched = await get(`/catalog?q=${encodeURIComponent(prefix)}&storage=8TB`);
    expect(mismatched.body.total).toBe(0);
    const base = {
      productId,
      variantId,
      source: 'Test retail source',
      sourceUrl: 'https://example.test/catalog',
      countryCode: 'NP',
      currency: 'NPR',
      priceKind: 'STORE',
      observedPrice: 200000,
      observedAt: new Date(Date.now() - 10000).toISOString(),
      published: false,
    };
    const draft = await write('/admin/price-intelligence', base, staff);
    expect(draft.status).toBe(201);
    expect(
      (await get(`/world-prices?productId=${productId}&variantId=${variantId}`)).body.observations,
    ).toEqual([]);
    const published = await write('/admin/price-intelligence', { ...base, published: true }, staff);
    expect(published.status).toBe(201);
    const observations = (await get(`/world-prices?productId=${productId}&variantId=${variantId}`))
      .body.observations;
    expect(observations).toHaveLength(1);
    expect(observations[0].currency).toBe('NPR');
    const invalid = await write(
      '/admin/price-intelligence',
      { ...base, published: true, variantId: null },
      staff,
    );
    expect(invalid.status).toBe(422);
    const format = await write('/imei-check', { imei: '490154203237518' });
    expect(format.status).toBe(200);
    expect(format.body.valid).toBe(true);
    expect(format.body.check).toBe('FORMAT_ONLY');
    expect(format.body).not.toHaveProperty('imei');
    expect(passesImeiChecksum('490154203237519')).toBe(false);
  });
});
