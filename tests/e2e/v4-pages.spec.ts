import { test, expect } from '@playwright/test';

test('V4 route wayfinding changes with the customer journey', async ({ page }) => {
  const routes = [
    { path: '/store', label: 'All products', related: 'Pre-book' },
    { path: '/trade-in', label: 'Trade in', related: 'Repair' },
    { path: '/repair', label: 'Repair', related: 'Trade in' },
    { path: '/support', label: 'Support', related: 'Stores' },
    { path: '/account', label: 'Your account', related: 'Orders' },
  ];
  for (const route of routes) {
    await page.goto(route.path);
    const nav = page.getByRole('navigation', { name: 'Page location and related links' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href', '/');
    await expect(nav.locator('[aria-current="page"]')).toHaveText(route.label);
    await expect(nav.getByRole('link', { name: route.related, exact: true })).toBeVisible();
  }
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Page location and related links' }),
  ).toHaveCount(0);
});

for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
  test(`V4 secondary pages have no document overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/store', '/trade-in', '/repair', '/support', '/account']) {
      await page.goto(route);
      await expect(
        page.getByRole('navigation', { name: 'Page location and related links' }),
      ).toBeVisible();
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            ),
          { message: `${route} must fit a ${width}px viewport` },
        )
        .toBe(true);
    }
  });
}

test('mobile V4 route shortcuts retain keyboard-visible links', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/repair');
  const nav = page.getByRole('navigation', { name: 'Page location and related links' });
  await expect(nav.getByRole('link', { name: 'Trade in' })).toBeVisible();
  await nav.getByRole('link', { name: 'Trade in' }).focus();
  await expect(nav.getByRole('link', { name: 'Trade in' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/trade-in$/);
});
