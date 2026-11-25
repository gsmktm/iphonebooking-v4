import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { HomeFeed, CatalogResult, Product } from '../../apps/web/src/services/types';

test('device finder returns real budget matches and carries the selected configuration to details', async ({
  page,
  request,
}) => {
  const feed: HomeFeed = await (await request.get('/api/v1/home')).json();
  const iphone = feed.iphones.find((p) =>
    p.variants.some((v) => v.stock.some((s) => s.available > 0)),
  )!;
  const cheapest = iphone.variants
    .filter((v) => v.stock.some((s) => s.available > 0))
    .sort((a, b) => a.price - b.price)[0];
  const budget = Math.ceil(cheapest.price / 100) + 10;
  const matching: CatalogResult = await (
    await request.get(
      `/api/v1/catalog?category=iphone&maxPrice=${budget * 100}&stock=in-stock&sort=price-low&pageSize=3`,
    )
  ).json();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Find my device', exact: true }).click();
  const finder = page.getByRole('dialog', { name: 'Find your next device', exact: true });
  await expect(finder).toBeVisible();
  await finder.getByLabel('What are you looking for?').selectOption('iphone');
  await finder.getByLabel('Your maximum budget in NPR').fill(String(budget));
  await finder.getByRole('button', { name: 'Show my matches' }).click();
  const product = matching.products[0];
  await expect(finder.getByRole('status')).toContainText(`${matching.total} matching`);
  await expect(finder.getByRole('heading', { name: product.name })).toBeVisible();
  const finderAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(finderAccessibility.violations).toEqual([]);
  await finder
    .getByRole('button', { name: `Configure matching ${product.name}`, exact: true })
    .click();
  const preview = page.getByRole('dialog', {
    name: `A closer look at ${product.name}`,
    exact: true,
  });
  const selected = product.variants[0];
  await expect(preview.locator('.config-price strong')).toContainText(
    new Intl.NumberFormat('en-US').format(selected.price / 100),
  );
  await expect(
    preview.getByRole('link', { name: 'Full details & specifications' }),
  ).toHaveAttribute('href', `/products/${product.slug}?variant=${selected.id}`);
  if (selected.stock.some((s) => s.store?.services.includes('Pickup'))) {
    await expect(preview.getByLabel('Check pickup availability')).toBeVisible();
    await expect(preview.locator('.config-pickup')).toContainText('In stock at this location.');
  }
  await preview.getByRole('link', { name: 'Full details & specifications' }).click();
  await expect(page).toHaveURL(new RegExp(`/products/${product.slug}\\?variant=${selected.id}$`));
});

test('homepage collections filter on the server and the product rail scrolls without page overflow', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const explore = page.locator('.home-explore');
  await expect(explore.locator('.product-card')).toHaveCount(8);
  await expect(explore.getByRole('button', { name: 'Next collection devices' })).toBeEnabled();
  await explore.getByRole('button', { name: 'Next collection devices' }).click();
  await expect
    .poll(() => explore.locator('.home-device-rail').evaluate((e) => e.scrollLeft))
    .toBeGreaterThan(50);
  await explore.getByRole('button', { name: 'Mac', exact: true }).click();
  const matching: CatalogResult = await (
    await request.get('/api/v1/catalog?category=mac&pageSize=8')
  ).json();
  await expect(explore.locator('.product-card')).toHaveCount(matching.products.length);
  for (const product of matching.products)
    await expect(explore.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  await explore.getByLabel('Collection', { exact: true }).selectOption('prebook');
  const prebook: CatalogResult = await (
    await request.get('/api/v1/catalog?category=mac&preorder=true&pageSize=8')
  ).json();
  if (!prebook.total) {
    await expect(explore).toContainText('No devices match this collection right now.');
    await explore.getByRole('button', { name: 'Reset collection' }).click();
    await expect(explore.locator('.product-card')).toHaveCount(8);
  } else await expect(explore.locator('.product-card')).toHaveCount(prebook.products.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('quick look adds a real variant, restores keyboard focus, and saved history can be cleared', async ({
  page,
  request,
}) => {
  const products: Product[] = await (await request.get('/api/v1/products?stock=in-stock')).json();
  const product = products[0];
  const variant = product.variants[0];
  await page.goto('/');
  const explore = page.locator('.home-explore');
  const opener = explore.getByRole('button', {
    name: `Quick look at ${product.name}`,
    exact: true,
  });
  await opener.click();
  const preview = page.getByRole('dialog', {
    name: `A closer look at ${product.name}`,
    exact: true,
  });
  await expect(preview.getByRole('button', { name: 'Add to bag', exact: true })).toBeEnabled();
  const previewAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(previewAccessibility.violations).toEqual([]);
  await preview.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(preview.getByRole('link', { name: 'Review your bag' })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('iphonebooking-shop-v2')!).state.cart,
    ),
  ).toEqual(expect.arrayContaining([expect.objectContaining({ variantId: variant.id })]));
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await explore
    .getByRole('button', { name: `Save ${product.name} to wishlist`, exact: true })
    .click();
  const personal = page.locator('.home-personal-shelf');
  await expect(personal.getByRole('heading', { name: product.name })).toBeVisible();
  await personal.getByRole('button', { name: 'Recently viewed', exact: true }).click();
  await expect(personal).toContainText('Your last eight devices in this browser tab.');
  await page.reload();
  await expect(page.locator('.home-personal-shelf')).toBeVisible();
  const history = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('iphonebooking-recent-devices')!).state.ids,
  );
  expect(history).toEqual([product.id]);
  await page
    .locator('.home-personal-shelf')
    .getByRole('button', { name: 'Recently viewed', exact: true })
    .click();
  await page
    .locator('.home-personal-shelf')
    .getByRole('button', { name: 'Clear browsing history' })
    .click();
  await expect(
    page
      .locator('.home-personal-shelf')
      .getByRole('button', { name: 'Recently viewed', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('.home-personal-shelf').getByRole('heading', { name: product.name }),
  ).toBeVisible();
});

test('finder preview retries a failed catalog refresh and returns focus without locking the page', async ({
  page,
  request,
}) => {
  const matching: CatalogResult = await (
    await request.get('/api/v1/catalog?category=iphone&stock=in-stock&sort=price-low&pageSize=3')
  ).json();
  const product = matching.products[0];
  let outage = true;
  await page.route(`**/api/v1/products/${product.slug}`, async (route) => {
    if (outage) {
      await route.fulfill({
        status: 503,
        json: {
          error: {
            code: 'UNAVAILABLE',
            message: 'Price and availability are temporarily unavailable.',
          },
        },
      });
    } else await route.continue();
  });
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Find my device', exact: true });
  await opener.click();
  const finder = page.getByRole('dialog', { name: 'Find your next device', exact: true });
  await finder.getByLabel('What are you looking for?').selectOption('iphone');
  await finder.getByRole('button', { name: 'Show my matches' }).click();
  await finder
    .getByRole('button', { name: `Configure matching ${product.name}`, exact: true })
    .click();
  const preview = page.getByRole('dialog', {
    name: `A closer look at ${product.name}`,
    exact: true,
  });
  await expect(preview.getByRole('alert')).toContainText(
    'Price and availability are temporarily unavailable.',
  );
  await expect(preview.getByRole('button', { name: 'Add to bag', exact: true })).toHaveCount(0);
  outage = false;
  await preview.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(preview.getByRole('button', { name: 'Add to bag', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('published CMS section visibility affects home composition and the discovery destination', async ({
  page,
}) => {
  await page.route('**/api/v1/home', async (route) => {
    const response = await route.fetch();
    const feed: HomeFeed = await response.json();
    const hidden = ['iphones', 'finder', 'trade-in'];
    feed.sections = [
      ...feed.sections.filter((b) => !hidden.includes(b.key ?? '') && b.key !== 'spotlights'),
      ...hidden.map((key) => ({ type: 'section', key, title: '', body: '', enabled: false })),
      {
        type: 'section',
        key: 'spotlights',
        title: 'A collection curated for you.',
        body: 'Published CMS copy.',
        enabled: true,
      },
    ];
    await route.fulfill({ response, json: feed });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A collection curated for you.' })).toBeVisible();
  await expect(page.locator('#collection')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Find my device', exact: true })).toHaveCount(0);
  await expect(page.locator('.tradein-panel')).toHaveCount(0);
  await expect(page.locator('.home-service-panel')).toHaveCount(1);
  await expect(page.locator('.campaign-base a')).toHaveAttribute('href', '#explore-devices');
});
