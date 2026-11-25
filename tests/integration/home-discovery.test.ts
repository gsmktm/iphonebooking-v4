import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { app } from '../../apps/api/server/app';
import { db } from '../../apps/api/server/db';

const prefix = `home-discovery-${randomUUID()}`;
let productId: string, stockVariant: string, preorderVariant: string;
const get = (query: string) => request(app).get(`/api/v1/catalog?q=${prefix}&${query}`);

beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
    throw Error('Isolated test database required.');
  const category = await db.category.create({
    data: { slug: prefix, name: prefix, description: 'Discovery test', image: 'phone' },
  });
  const store = await db.store.create({
    data: {
      slug: prefix,
      name: prefix,
      address: 'Test only',
      hours: 'Test only',
      phone: 'Test only',
      services: ['Pickup'],
    },
  });
  const product = await db.product.create({
    data: {
      slug: prefix,
      name: prefix,
      categoryId: category.id,
      description: 'Isolated finder fixture',
      tagline: 'Test only',
      image: 'phone',
      gallery: [],
      specs: {},
      variants: {
        create: [
          {
            sku: `${prefix}-cheap`,
            storage: '128GB',
            color: 'Gold',
            colorHex: '#dec28d',
            price: 100000,
            comparePrice: 120000,
            deposit: 10000,
            stock: { create: { storeId: store.id, available: 0 } },
          },
          {
            sku: `${prefix}-stock`,
            storage: '256GB',
            color: 'Gold',
            colorHex: '#dec28d',
            price: 150000,
            deposit: 10000,
            stock: { create: { storeId: store.id, available: 2 } },
          },
          {
            sku: `${prefix}-preorder`,
            storage: '512GB',
            color: 'Gold',
            colorHex: '#dec28d',
            price: 300000,
            comparePrice: 350000,
            deposit: 10000,
            preorder: true,
            stock: { create: { storeId: store.id, available: 3 } },
          },
        ],
      },
    },
    include: { variants: true },
  });
  productId = product.id;
  stockVariant = product.variants.find((v) => v.storage === '256GB')!.id;
  preorderVariant = product.variants.find((v) => v.preorder)!.id;
});
afterAll(async () => {
  await db.inventoryStock.deleteMany({ where: { variant: { product: { slug: prefix } } } });
  await db.productVariant.deleteMany({ where: { product: { slug: prefix } } });
  await db.product.deleteMany({ where: { slug: prefix } });
  await db.category.deleteMany({ where: { slug: prefix } });
  await db.store.deleteMany({ where: { slug: prefix } });
  await db.$disconnect();
});

describe('homepage device discovery', () => {
  it('matches budget and stock on the same configuration and exposes public pickup details only', async () => {
    const response = await get(
      `category=${prefix}&maxPrice=150000&stock=in-stock&sort=price-low&pageSize=3`,
    );
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.products[0].variants.map((v: { id: string }) => v.id)).toEqual([
      stockVariant,
    ]);
    const store = response.body.products[0].variants[0].stock[0].store;
    expect(store.services).toContain('Pickup');
    expect(store).not.toHaveProperty('retailerId');
    expect(store).not.toHaveProperty('retailerAssignedAt');
    expect((await get('maxPrice=99999&stock=in-stock')).body.total).toBe(0);
    expect((await get('maxPrice=-1')).status).toBe(422);
  });
  it('keeps offers, pre-booking, budget and availability tied to the matching variant', async () => {
    expect((await get('deals=true&stock=in-stock&maxPrice=150000')).body.total).toBe(0);
    expect((await get('preorder=true&maxPrice=150000')).body.total).toBe(0);
    const response = await get('deals=true&preorder=true&stock=in-stock&maxPrice=300000');
    expect(response.body.products[0].variants.map((v: { id: string }) => v.id)).toEqual([
      preorderVariant,
    ]);
    await db.product.update({ where: { id: productId }, data: { active: false } });
    try {
      expect((await get('')).body.total).toBe(0);
      expect((await request(app).get(`/api/v1/products/${prefix}`)).status).toBe(404);
    } finally {
      await db.product.update({ where: { id: productId }, data: { active: true } });
    }
  });
  it('publishes CMS visibility flags for new homepage sections and keeps drafts private', async () => {
    const original = await db.cMSPage.findUnique({ where: { slug: 'home' } });
    const data = {
      title: 'Home',
      description: 'Isolated CMS test',
      published: true,
      blocks: [
        {
          type: 'section',
          key: 'spotlights',
          title: 'A test spotlight',
          body: 'Published copy',
          enabled: false,
        },
        {
          type: 'section',
          key: 'finder',
          title: 'A test finder',
          body: 'Published finder',
          enabled: true,
        },
      ],
    };
    try {
      await db.cMSPage.upsert({
        where: { slug: 'home' },
        create: { slug: 'home', ...data },
        update: data,
      });
      const response = await request(app).get('/api/v1/home');
      expect(response.status).toBe(200);
      expect(response.body.sections).toEqual(data.blocks);
      await db.cMSPage.update({ where: { slug: 'home' }, data: { published: false } });
      expect((await request(app).get('/api/v1/home')).body.sections).toEqual([]);
    } finally {
      if (original)
        await db.cMSPage.update({
          where: { slug: 'home' },
          data: {
            title: original.title,
            description: original.description,
            published: original.published,
            blocks: original.blocks as Parameters<typeof db.cMSPage.create>[0]['data']['blocks'],
          },
        });
      else await db.cMSPage.deleteMany({ where: { slug: 'home' } });
    }
  });
});
