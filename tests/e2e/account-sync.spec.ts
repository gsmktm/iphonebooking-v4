import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const headers = { 'X-Requested-With': 'iPhoneBooking', Origin: 'http://localhost:5173' };
test('anonymous wishlist migrates, conflicts recover, and accounts remain separate', async ({
  page,
  context,
  baseURL,
}) => {
  if (baseURL !== 'http://localhost:5173') throw new Error('Use the local development site.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Save iPhone 16 Pro to wishlist' }).click();
  const email = `sync-browser-${randomUUID()}@example.test`,
    password = `Test-${randomUUID()}`;
  const registration = await context.request.post('/api/v1/auth/register', {
    headers,
    data: { name: 'Browser Sync Test', email, password },
  });
  expect(registration.ok()).toBe(true);
  const user = await registration.json();
  await page.goto('/');
  const state = async () => (await context.request.get('/api/v1/account/shop-state')).json();
  await expect.poll(async () => (await state()).wishlist.length).toBe(1);
  const saved = await state();
  await expect(
    page.getByRole('button', { name: 'Remove iPhone 16 Pro from wishlist' }),
  ).toBeVisible();
  const external = await context.request.put('/api/v1/account/shop-state', {
    headers,
    data: { accountId: user.id, revision: saved.revision, cart: [], wishlist: [] },
  });
  expect(external.ok()).toBe(true);
  await page.getByRole('button', { name: 'Remove iPhone 16 Pro from wishlist' }).click();
  await expect(page.locator('.sync-notice')).toContainText('changed on another device');
  await page.getByRole('button', { name: 'Replace with saved selection' }).click();
  await expect(page.locator('.sync-notice')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save iPhone 16 Pro to wishlist' }).click();
  await expect.poll(async () => (await state()).wishlist.length).toBe(1);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('iphonebooking-shop-v2')!).state.wishlist.length,
      ),
    )
    .toBe(0);
  const second = await context.request.post('/api/v1/auth/register', {
    headers,
    data: {
      name: 'Second Browser Account',
      email: `sync-second-${randomUUID()}@example.test`,
      password: `Test-${randomUUID()}`,
    },
  });
  expect(second.ok()).toBe(true);
  await page.goto('/wishlist');
  await expect(page.locator('.product-card')).toHaveCount(0);
  expect((await state()).wishlist).toEqual([]);
  await context.request.post('/api/v1/auth/logout', { headers, data: {} });
  expect(
    (await context.request.post('/api/v1/auth/login', { headers, data: { email, password } })).ok(),
  ).toBe(true);
  await page.goto('/wishlist');
  await expect(page.locator('.product-card')).toHaveCount(1);
});
