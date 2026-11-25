import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { app } from '../../apps/api/server/app';
import { db } from '../../apps/api/server/db';
import { hash, token } from '../../apps/api/server/core';
import { contentFields } from '../../apps/api/server/schemas/content';

const prefix = `v2-reviews-${randomUUID()}`;
let productId: string,
  variantId: string,
  userId: string,
  roleId: string,
  customer: string,
  other: string,
  moderator: string,
  orderId: string,
  reviewId: string,
  revision: string;
const get = (path: string, cookie?: string) => {
  const call = request(app).get(`/api/v1${path}`);
  return cookie ? call.set('Cookie', cookie) : call;
};
const write = (method: 'post' | 'patch', path: string, body: object, cookie?: string) => {
  const call = request(app)
    [method](`/api/v1${path}`)
    .set('X-Requested-With', 'iPhoneBooking')
    .set('Origin', 'http://localhost:5173')
    .send(body);
  return cookie ? call.set('Cookie', cookie) : call;
};
const review = {
  rating: 4,
  title: 'A considered purchase',
  body: 'The configuration and order history were easy to understand. This is an isolated automated test review.',
};

beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
    throw Error('Isolated test database required.');
  const role = await db.role.create({
    data: { name: prefix, permissions: ['review.read', 'review.moderate'] },
  });
  roleId = role.id;
  async function identity(name: string, staff = false) {
    const user = await db.user.create({
      data: {
        name,
        email: `${prefix}-${name.split(' ')[0]}@example.test`,
        passwordHash: 'unused-test-hash',
        ...(staff ? { roleId } : {}),
      },
    });
    const raw = token();
    await db.userSession.create({
      data: { userId: user.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 3600000) },
    });
    return { id: user.id, cookie: `session=${raw}` };
  }
  const a = await identity('Mira Review Test'),
    b = await identity('Other Review Test'),
    c = await identity('Moderator Review Test', true);
  userId = a.id;
  customer = a.cookie;
  other = b.cookie;
  moderator = c.cookie;
  const category = await db.category.create({
    data: { slug: prefix, name: prefix, description: 'Isolated test category', image: 'phone' },
  });
  const product = await db.product.create({
    data: {
      categoryId: category.id,
      slug: prefix,
      name: prefix,
      tagline: 'Isolated test device',
      description: 'An integration fixture',
      image: 'phone',
      gallery: [],
      specs: {},
      featured: true,
    },
  });
  productId = product.id;
  const variant = await db.productVariant.create({
    data: {
      productId,
      sku: prefix,
      storage: '256GB',
      color: 'Gold',
      colorHex: '#dec28d',
      price: 200000,
      deposit: 10000,
    },
  });
  variantId = variant.id;
  const order = await db.order.create({
    data: {
      userId,
      number: prefix,
      name: 'Mira Review Test',
      email: `${prefix}@example.test`,
      phone: '9800000000',
      address: {},
      fulfillment: 'PICKUP',
      total: 200000,
      dueNow: 200000,
      trackingHash: hash(token()),
      idempotencyKey: randomUUID(),
      expiresAt: new Date(Date.now() + 3600000),
      items: {
        create: { variantId, unitPrice: 200000, quantity: 1, stockId: 'test-stock-reference' },
      },
    },
  });
  orderId = order.id;
});
afterAll(async () => {
  const repairScope = { user: { email: { startsWith: prefix } } };
  await db.repairStatusHistory.deleteMany({ where: { repair: repairScope } });
  await db.repair.deleteMany({ where: repairScope });
  await db.review.deleteMany({ where: { product: { slug: prefix } } });
  await db.orderItem.deleteMany({ where: { order: { number: prefix } } });
  await db.order.deleteMany({ where: { number: prefix } });
  await db.productVariant.deleteMany({ where: { product: { slug: prefix } } });
  await db.product.deleteMany({ where: { slug: prefix } });
  await db.category.deleteMany({ where: { slug: prefix } });
  await db.cMSPage.deleteMany({ where: { slug: { startsWith: `blog-${prefix}` } } });
  await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await db.role.deleteMany({ where: { name: prefix } });
  await db.$disconnect();
});

describe('verified purchase reviews', () => {
  it('requires authentication, a delivered purchase and validated customer-only fields', async () => {
    expect((await write('post', `/products/${prefix}/reviews`, review)).status).toBe(401);
    expect(
      (await write('post', `/products/${prefix}/reviews`, review, customer)).body.error.code,
    ).toBe('VERIFIED_PURCHASE_REQUIRED');
    expect(
      (
        await write(
          'post',
          `/products/${prefix}/reviews`,
          { ...review, status: 'PUBLISHED' },
          customer,
        )
      ).status,
    ).toBe(422);
    expect(
      (await write('post', `/products/${prefix}/reviews`, { ...review, rating: 6 }, customer))
        .status,
    ).toBe(422);
    expect((await get(`/products/${prefix}/reviews`, customer)).body.canReview).toBe(false);
    await db.order.update({ where: { id: orderId }, data: { status: 'DELIVERED' } });
    expect((await get(`/products/${prefix}/reviews`, customer)).body.canReview).toBe(true);
    expect((await write('post', `/products/${prefix}/reviews`, review, other)).status).toBe(403);
    const saved = await write('post', `/products/${prefix}/reviews`, review, customer);
    expect(saved.status).toBe(201);
    expect(saved.body.status).toBe('PENDING');
    reviewId = saved.body.id;
    expect((await write('post', `/products/${prefix}/reviews`, review, customer)).status).toBe(409);
  });
  it('keeps pending text private and enforces independent server-side moderation', async () => {
    const visible = await get(`/products/${prefix}/reviews`);
    expect(visible.body.rows).toEqual([]);
    expect(visible.body.average).toBeNull();
    expect(visible.body.ownReview).toBeNull();
    expect((await get(`/products/${prefix}/reviews`, customer)).body.ownReview.id).toBe(reviewId);
    expect((await get(`/products/${prefix}/reviews`, other)).body.ownReview).toBeNull();
    expect((await get('/admin/reviews', customer)).status).toBe(403);
    const row = await db.review.findUniqueOrThrow({ where: { id: reviewId } });
    revision = row.updatedAt.toISOString();
    const decision = {
      status: 'PUBLISHED',
      reason: 'Verified purchase and relevant experience.',
      expectedUpdatedAt: revision,
    };
    expect((await write('patch', `/admin/reviews/${reviewId}`, decision, customer)).status).toBe(
      403,
    );
    await db.user.update({ where: { id: userId }, data: { roleId } });
    expect(
      (await write('patch', `/admin/reviews/${reviewId}`, decision, customer)).body.error.code,
    ).toBe('INDEPENDENT_MODERATION_REQUIRED');
    await db.user.update({ where: { id: userId }, data: { roleId: null } });
    const accepted = await write('patch', `/admin/reviews/${reviewId}`, decision, moderator);
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe('PUBLISHED');
    expect(
      (
        await write(
          'patch',
          `/admin/reviews/${reviewId}`,
          { ...decision, status: 'REJECTED' },
          moderator,
        )
      ).body.error.code,
    ).toBe('REVIEW_CHANGED');
    expect(
      await db.auditLog.count({ where: { entityId: reviewId, action: 'review.moderate' } }),
    ).toBe(1);
    revision = accepted.body.updatedAt;
  });
  it('publishes accurate aggregates without private identifiers and can withdraw publication', async () => {
    const response = await get(`/products/${prefix}/reviews`);
    expect(response.body.total).toBe(1);
    expect(response.body.average).toBe(4);
    expect(response.body.rows[0]).toMatchObject({
      author: 'Mira',
      verifiedPurchase: true,
      rating: 4,
    });
    for (const key of ['email', 'userId', 'orderItemId', 'order', 'user'])
      expect(response.body.rows[0]).not.toHaveProperty(key);
    const home = await get('/home');
    expect(home.status).toBe(200);
    expect(home.body.reviews.some((row: { id: string }) => row.id === reviewId)).toBe(true);
    await db.product.update({ where: { id: productId }, data: { active: false } });
    expect(
      (await get('/home')).body.reviews.some((row: { id: string }) => row.id === reviewId),
    ).toBe(false);
    expect((await get(`/products/${prefix}/reviews`)).status).toBe(404);
    await db.product.update({ where: { id: productId }, data: { active: true } });
    expect(
      (
        await write(
          'patch',
          `/admin/reviews/${reviewId}`,
          {
            status: 'REJECTED',
            reason: 'Withdraw this isolated test publication.',
            expectedUpdatedAt: revision,
          },
          moderator,
        )
      ).status,
    ).toBe(200);
    expect((await get(`/products/${prefix}/reviews`)).body.rows).toEqual([]);
  });
});

describe('published homepage feed', () => {
  it('returns bounded active catalog data and published articles only', async () => {
    await db.cMSPage.createMany({
      data: [
        {
          slug: `blog-${prefix}-draft`,
          title: 'Private editorial draft',
          description: 'Draft',
          published: false,
          blocks: [],
        },
        {
          slug: `blog-${prefix}-published`,
          title: 'Published test guide',
          description: 'A database-backed test article',
          published: true,
          blocks: [],
        },
      ],
    });
    const response = await get('/home');
    expect(response.status).toBe(200);
    expect(response.body.products.length).toBeLessThanOrEqual(12);
    expect(response.body.iphones.length).toBeLessThanOrEqual(4);
    expect(
      response.body.products.every(
        (product: { active: boolean; variants: unknown[] }) =>
          product.active && product.variants.length,
      ),
    ).toBe(true);
    expect(
      response.body.articles.some(
        (article: { slug: string }) => article.slug === `${prefix}-published`,
      ),
    ).toBe(true);
    expect(
      response.body.articles.some(
        (article: { slug: string }) => article.slug === `${prefix}-draft`,
      ),
    ).toBe(false);
    expect(response.body.reviewSummary.average).toBeNull();
  });
  it('validates keyed section content and rejects duplicate sections and unsafe destinations', () => {
    const block = {
      type: 'section',
      key: 'ecosystem',
      title: 'A custom collection',
      body: 'CMS copy',
      href: '/store',
    };
    const fields = { title: 'Home', description: 'Home page', published: true, blocks: [block] };
    expect(contentFields.safeParse(fields).success).toBe(true);
    expect(
      contentFields.safeParse({ ...fields, blocks: [{ ...block, key: 'finder', enabled: false }] })
        .success,
    ).toBe(true);
    expect(
      contentFields.safeParse({ ...fields, blocks: [{ ...block, enabled: 'false' }] }).success,
    ).toBe(false);
    expect(
      contentFields.safeParse({ ...fields, blocks: [{ ...block, type: 'hero', enabled: false }] })
        .success,
    ).toBe(false);
    expect(contentFields.safeParse({ ...fields, blocks: [block, block] }).success).toBe(false);
    expect(
      contentFields.safeParse({ ...fields, blocks: [{ ...block, key: undefined }] }).success,
    ).toBe(false);
    expect(
      contentFields.safeParse({ ...fields, blocks: [{ ...block, href: '//example.test' }] })
        .success,
    ).toBe(false);
    expect(
      contentFields.safeParse({ ...fields, blocks: [{ ...block, href: '/\\example.test' }] })
        .success,
    ).toBe(false);
    expect(
      contentFields.safeParse({ ...fields, blocks: [{ ...block, href: '/store\u0000' }] }).success,
    ).toBe(false);
  });
  it('shows repair tracking only to the owner and omits technician assignments', async () => {
    const repair = await db.repair.create({
      data: {
        userId,
        model: 'Integration test device',
        issue: 'Isolated tracking test',
        description: 'Owner tracking fixture',
        method: 'STORE',
        technician: 'Private assignment',
        history: { create: { status: 'REQUESTED', note: 'Request received' } },
      },
    });
    expect((await get(`/repairs/${repair.id}`)).status).toBe(401);
    expect((await get(`/repairs/${repair.id}`, other)).status).toBe(404);
    const response = await get(`/repairs/${repair.id}`, customer);
    expect(response.status).toBe(200);
    expect(response.body.history[0].note).toBe('Request received');
    expect(response.body).not.toHaveProperty('technician');
    expect(response.body).not.toHaveProperty('assignedTechnicianId');
  });
  it('requires database readiness while liveness remains available', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/ready')).status).toBe(200);
  });
});
