import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const fakeBucket = vi.hoisted(() => new Map<string, Uint8Array>());

vi.mock('@aws-sdk/client-s3', () => {
  class PutObjectCommand {
    constructor(public input: { Key: string; Body: Uint8Array }) {}
  }
  class GetObjectCommand {
    constructor(public input: { Key: string }) {}
  }
  class DeleteObjectCommand {
    constructor(public input: { Key: string }) {}
  }
  class S3Client {
    async send(command: PutObjectCommand | GetObjectCommand | DeleteObjectCommand) {
      const key = command.input.Key;
      if (command instanceof PutObjectCommand) {
        fakeBucket.set(key, new Uint8Array(command.input.Body));
        return {};
      }
      if (command instanceof DeleteObjectCommand) {
        fakeBucket.delete(key);
        return {};
      }
      const value = fakeBucket.get(key);
      if (!value) throw new Error('No such image');
      return { Body: { transformToByteArray: async () => value } };
    }
  }
  return { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client };
});

import { app } from '../../apps/api/server/app';
import { db } from '../../apps/api/server/db';
import { hash, token } from '../../apps/api/server/core';

const unique = randomUUID();
const prefix = `image-test-${unique}`;
let staffCookie = '';
let productId = '';
let productUpdatedAt = '';
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',
  'base64',
);

beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
    throw new Error('Media integration suite requires isolated _test database.');
  process.env.MEDIA_S3_ENDPOINT = 'https://mock-storage.example.test';
  process.env.MEDIA_S3_BUCKET = 'mock-private-media';
  process.env.MEDIA_S3_ACCESS_KEY_ID = 'test-access-key';
  process.env.MEDIA_S3_SECRET_ACCESS_KEY = 'test-secret-key';
  process.env.MEDIA_S3_REGION = 'auto';

  const role = await db.role.create({
    data: { name: `${prefix}-staff`, permissions: ['product.read', 'product.update', 'product.create'] },
  });
  const user = await db.user.create({
    data: {
      name: 'Media fixture staff',
      email: `${prefix}@example.test`,
      passwordHash: await bcrypt.hash('media-fixture-only', 4),
      roleId: role.id,
    },
  });
  const raw = token();
  await db.userSession.create({
    data: { userId: user.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 60_000) },
  });
  staffCookie = `session=${raw}`;
  const category = await db.category.create({
    data: { slug: prefix, name: 'Media test category', description: 'Isolated test', image: 'phone' },
  });
  const product = await db.product.create({
    data: {
      name: 'Media fixture device',
      slug: prefix,
      tagline: 'Test only',
      description: 'Private fixture',
      image: '/images/product-placeholder.png',
      gallery: [],
      specs: {},
      categoryId: category.id,
    },
  });
  productId = product.id;
  productUpdatedAt = product.updatedAt.toISOString();
});

afterAll(async () => {
  fakeBucket.clear();
  await db.$disconnect();
});

describe('full-stack image upload and publication lifecycle', () => {
  it('rejects anonymous upload before touching object storage', async () => {
    const response = await request(app)
      .post('/api/v1/admin/media/uploads')
      .set('Content-Type', 'image/png')
      .set('X-Requested-With', 'iPhoneBooking')
      .send(tinyPng);
    expect(response.status).toBe(401);
    expect(fakeBucket.size).toBe(0);
  });

  it('uploads a legally owned photo privately; publishes only when attached to product; and retains source', async () => {
    const result = await request(app)
      .post('/api/v1/admin/media/uploads')
      .set('Cookie', staffCookie)
      .set('X-Requested-With', 'iPhoneBooking')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'image/png')
      .set('X-Image-Source-Type', 'OWNED')
      .set('X-Image-Name', encodeURIComponent('our-camera-photo.png'))
      .set('X-Image-Source-URL', '')
      .set('X-Image-Credit', encodeURIComponent('Media fixture photographer'))
      .set('X-Image-License', '')
      .set('X-Image-License-URL', '')
      .set('X-Image-Alt', encodeURIComponent('A testing pixel used to verify image delivery'))
      .send(tinyPng);
    expect(result.status).toBe(201);
    const { id, url } = result.body;
    expect(url).toMatch(/^\/api\/v1\/media\/[0-9a-f-]{36}$/);
    expect(fakeBucket.size).toBe(1);
    expect((await request(app).get(url)).status).toBe(404);

    const privateResult = await request(app).get(url).set('Cookie', staffCookie);
    expect(privateResult.status).toBe(200);
    expect(privateResult.headers['content-type']).toMatch(/image\/png/);
    expect(privateResult.body).toEqual(tinyPng);

    const edit = await request(app)
      .patch('/api/v1/admin/products/' + productId)
      .set('Cookie', staffCookie)
      .set('X-Requested-With', 'iPhoneBooking')
      .set('Origin', 'http://localhost:5173')
      .send({ image: url, gallery: [], expectedUpdatedAt: productUpdatedAt });
    expect(edit.status).toBe(200);
    expect(edit.body.image).toBe(url);

    const published = await request(app).get(url);
    expect(published.status).toBe(200);
    expect(published.body).toEqual(tinyPng);

    const credits = await request(app).get('/api/v1/media/credits?slug=' + prefix);
    expect(credits.status).toBe(200);
    expect(credits.body).toEqual([
      expect.objectContaining({
        id,
        url,
        sourceType: 'OWNED',
        sourceCredit: 'Media fixture photographer',
      }),
    ]);

    const stale = await request(app)
      .patch('/api/v1/admin/products/' + productId)
      .set('Cookie', staffCookie)
      .set('X-Requested-With', 'iPhoneBooking')
      .set('Origin', 'http://localhost:5173')
      .send({ name: 'Stale edit', expectedUpdatedAt: productUpdatedAt });
    expect(stale.status).toBe(409);

    const detached = await request(app)
      .patch('/api/v1/admin/products/' + productId)
      .set('Cookie', staffCookie)
      .set('X-Requested-With', 'iPhoneBooking')
      .set('Origin', 'http://localhost:5173')
      .send({ image: '/images/product-placeholder.png', expectedUpdatedAt: edit.body.updatedAt });
    expect(detached.status).toBe(200);
    expect((await request(app).get(url)).status).toBe(404);
    expect(await db.mediaAsset.count({ where: { id } })).toBe(1);
  });

  it('rejects a fake JPEG body and a licensed image without rights metadata', async () => {
    const response = await request(app)
      .post('/api/v1/admin/media/uploads')
      .set('Cookie', staffCookie)
      .set('X-Requested-With', 'iPhoneBooking')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'image/jpeg')
      .set('X-Image-Source-Type', 'LICENSED')
      .set('X-Image-Credit', encodeURIComponent('Media fixture author'))
      .set('X-Image-Alt', encodeURIComponent('Test photograph'))
      .send(Buffer.from('<html>not really jpeg</html>'));
    expect(response.status).toBe(422);
  });
});
