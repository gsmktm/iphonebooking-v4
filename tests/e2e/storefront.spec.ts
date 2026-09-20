import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('configure a product and complete an unpaid guest reservation', async ({ page }) => {
  await page.goto('/products/iphone-16-pro');
  await expect(page.getByRole('heading', { name: 'iPhone 16 Pro', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '256GB', exact: false }).click();
  await page.locator('.purchase-actions').getByRole('button', { name: 'Add to bag' }).click();
  await page.getByRole('link', { name: 'View your bag' }).click();
  await expect(page.locator('.cart-line-details')).toContainText('256GB');
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await page.getByLabel('Full name').fill('Browser Test');
  await page
    .locator('#main')
    .getByLabel('Email address', { exact: true })
    .fill(`browser-${Date.now()}@example.test`);
  await page.getByLabel('Phone number').fill('9800000000');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Place unpaid reservation' }).click();
  await expect(page.getByRole('heading', { name: 'Your next chapter is reserved.' })).toBeVisible();
  await expect(page.getByLabel('Private receipt key')).toHaveValue(/[a-f0-9]{64}/);
});
test('search and comparison are interactive', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search products' }).click();
  await page.getByLabel('Search catalog').fill('MacBook');
  await expect(page.locator('.search-results')).toContainText('MacBook Air');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Compare iPhone 16 Pro' }).click();
  await page.getByRole('button', { name: 'Compare MacBook Air' }).click();
  await page.locator('.compare-floating').click();
  await expect(page.locator('.comparison-table')).toContainText('iPhone 16 Pro');
  await expect(page.locator('.comparison-table')).toContainText('MacBook Air');
});
for (const width of [375, 414, 768, 1024, 1440])
  test(`homepage and product fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/products/iphone-16-pro', '/store', '/repair', '/account']) {
      await page.goto(path);
      await page.locator('h1').waitFor();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
    }
  });
test('homepage passes automated WCAG AA checks', async ({ page }) => {
  await page.goto('/');
  await page.locator('.product-card').first().waitFor();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test('customer login does not expose admin modules', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Good to see you.' })).toBeVisible();
  await expect(page.locator('.admin-metrics')).toHaveCount(0);
});

test('staff can open operational modules and edit dialogs', async ({ page }) => {
  const { config } = await import('dotenv');
  config({ quiet: true });
  test.skip(!process.env.ADMIN_PASSWORD, 'Local seeded admin credential is required.');
  await page.goto('/admin');
  await page
    .getByLabel('Email address', { exact: true })
    .fill(process.env.ADMIN_EMAIL ?? 'admin@iphonebooking.local');
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Good things, in motion.' })).toBeVisible();
  for (const path of [
    'products',
    'inventory',
    'repairs',
    'trade-ins',
    'content',
    'roles',
    'audit-logs',
  ]) {
    await page.goto(`/admin/${path}`);
    await expect(page.locator('.admin-page-heading h1')).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
  }
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'View', exact: true }).first().click();
  await page.getByRole('button', { name: 'Edit product', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit product' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/admin');
  await expect(page.locator('.admin-metrics')).toBeVisible();
  await page.screenshot({ path: '/tmp/iphonebooking-admin.png', fullPage: true });
});
