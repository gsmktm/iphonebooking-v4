import { expect, test } from '@playwright/test';

const families = ['iphone', 'ipad', 'ipod', 'mac'] as const;

test('history API exposes a separate source-backed archive, not merchant stock', async ({
  request,
}) => {
  const summary = await request.get('/api/v1/apple-history/summary');
  expect(summary.status()).toBe(200);
  const stats = await summary.json();
  expect(stats.total).toBeGreaterThanOrEqual(280);
  expect(stats.earliest).toBe(1984);
  expect(stats.families).toHaveLength(4);

  const all = await request.get('/api/v1/apple-history?pageSize=6');
  expect(all.status()).toBe(200);
  const data = await all.json();
  expect(data.items).toHaveLength(6);
  for (const record of data.items) {
    expect(record.sourceUrl).toMatch(/^https:\/\/(?:support\.apple\.com|www\.apple\.com)\//);
    expect(record.introducedYear).toBeGreaterThanOrEqual(1984);
    expect(record).not.toHaveProperty('price');
    expect(record).not.toHaveProperty('stock');
    expect(record).not.toHaveProperty('variant');
    if (record.imageUrl) {
      expect(record.imageSourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(record.imageLicense).toBeTruthy();
      expect(record.imageCredit).toBeTruthy();
    }
  }
});

for (const family of families) {
  test(`historical ${family} page shows models and sources without retail buttons`, async ({
    page,
  }) => {
    await page.goto(`/history/apple/${family}`);
    await expect(page.getByRole('heading', { name: /through the years/i })).toBeVisible();
    const cards = page.locator('.apple-history-card');
    await expect(cards.first()).toBeVisible();
    await expect(cards.first().getByText(/ARCHIVE · NOT FOR SALE/i)).toBeVisible();
    await expect(cards.first().locator('.apple-history-card-bottom').getByRole('link', { name: 'View history' })).toBeVisible();
    await expect(cards.first().getByRole('link', { name: /buy now|add to bag/i })).toHaveCount(0);
  });
}

test('original iPhone 2007 archival photo has attribution and Apple record', async ({ page }) => {
  await page.goto('/history/apple/device/iphone-iphone-2007');
  await expect(page.getByRole('heading', { name: 'iPhone', exact: true })).toBeVisible();
  await expect(page.getByText('2007', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.apple-history-photo img')).toHaveAttribute(
    'src',
    /^https:\/\/thumb\.wikimedia\.org\//,
  );
  await expect(page.getByText('CC BY-SA 2.0')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Official Apple record' })).toHaveAttribute(
    'href',
    /^https:\/\/support\.apple\.com\//,
  );
});

for (const width of [320, 375, 768, 1440]) {
  test(`history archive fits viewport ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/history/apple');
    await expect(page.locator('.apple-history-card').first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}
