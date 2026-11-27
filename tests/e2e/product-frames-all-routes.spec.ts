import { expect, test } from '@playwright/test';

const requestedRoutes = [
  '/store',
  '/iphone',
  '/mac',
  '/ipad',
  '/watch',
  '/airpods',
  '/accessories',
  '/prebook',
  '/trade-in',
  '/repair',
  '/deals',
];

for (const path of requestedRoutes) {
  test(`${path} has device-frame product discovery and safe purchasing`, async ({ page }) => {
    await page.goto(path);
    const cards = page.locator('.device-framed-card, .device-family-placeholder');
    await expect(cards.first()).toBeVisible();
    await expect(cards.first().locator('.home-device-frame')).toBeVisible();
    const framedProducts = page.locator('.device-framed-card');
    if (await framedProducts.count()) {
      const first = framedProducts.first();
      await expect(first.locator('.product-card-bottom')).toBeVisible();
      const buy = first.locator('.device-card-buy-button');
      await expect(buy).toBeVisible();
      await expect(buy).toHaveAttribute('href', /^\/products\/[^/]+/);
      await expect(buy).toContainText(/Buy now|Pre-book now|Check availability|View product/);
    } else {
      // Never invent Buy Now or a price when the newly created database is empty.
      await expect(cards.first().getByText('Price not available')).toBeVisible();
      await expect(cards.first().locator('.device-card-buy-button')).toHaveCount(0);
    }
  });
}

for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
  test(`device frame collection fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/store', '/iphone', '/airpods', '/repair']) {
      await page.goto(route);
      const card = page.locator('.device-framed-card, .device-family-placeholder').first();
      await expect(card).toBeVisible();
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('.home-device-frame')).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        )
        .toBe(true);
    }
  });
}
