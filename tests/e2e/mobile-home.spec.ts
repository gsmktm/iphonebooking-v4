import { test, expect } from '@playwright/test';
import type { Product } from '../../apps/web/src/services/types';
test('home configurator uses catalog prices and adds the chosen variant to the bag', async ({
  page,
  request,
}) => {
  const products: Product[] = await (await request.get('/api/v1/products')).json();
  const product = products
    .filter((p) => p.featured)
    .slice(0, 4)
    .find((p) => p.category.slug === 'iphone')!;
  const available = product.variants.filter((v) => v.stock.some((s) => s.available > 0));
  const variant = available[1] ?? available[0];
  expect(variant).toBeTruthy();
  await page.goto('/');
  const config = page.locator('.quick-config');
  await config.getByRole('button', { name: variant.color, exact: true }).click();
  await config.getByRole('button', { name: variant.storage, exact: true }).click();
  await expect(config.locator('.config-price strong')).toContainText(
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(variant.price / 100),
  );
  await config.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(config.locator('.config-result')).toContainText('Review your bag');
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('iphonebooking-shop-v2')!).state.cart,
  );
  expect(saved).toEqual(
    expect.arrayContaining([expect.objectContaining({ variantId: variant.id, quantity: 1 })]),
  );
  await config.getByRole('link', { name: 'Review your bag' }).click();
  await expect(page).toHaveURL(/\/cart$/);
});
test('mobile home fits small screens, supports app navigation and explains installation', async ({
  page,
}) => {
  for (const width of [320, 375, 414, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    // Keep the failing viewport actionable without printing customer data.
    console.log('Mobile viewport under test:', width);
    await expect(
      page.locator('.quick-config'),
      `Home configurator should render at ${width}px (route: /)`,
    ).toBeVisible({ timeout: 12000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    if (width >= 1024)
      expect(await page.locator('.quick-config').evaluate((e) => getComputedStyle(e).display)).toBe(
        'grid',
      );
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('button', { name: 'Install web app' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add iPhoneBooking to your home screen' });
  await expect(dialog).toContainText('Add to Home Screen');
  await page.keyboard.press('Escape');
  await page
    .getByRole('navigation', { name: 'Mobile app navigation' })
    .getByRole('link', { name: 'Care' })
    .click();
  await expect(page).toHaveURL(/\/repair$/);
});
