import { expect, test } from '@playwright/test';

const categories = [
  ['iphone', 'iphone-18-pro'],
  ['mac', 'macbook-air-m5'],
  ['ipad', 'ipad-pro'],
  ['watch', 'apple-watch-series-12'],
  ['airpods', 'airpods-5'],
  ['accessories', 'apple-pencil-pro'],
] as const;

test('Apple.com reference API is backed by separate verified catalog rows', async ({
  request,
}) => {
  const response = await request.get('/api/v1/official-apple-models');
  expect(response.status()).toBe(200);
  const records = (await response.json()) as Array<Record<string, unknown>>;
  expect(records).toHaveLength(20);
  for (const record of records) {
    expect(record.officialUrl).toMatch(/^https:\/\/www\.apple\.com\//);
    expect(record.sourceCheckedAt).toBeTruthy();
    expect(record.name).toBeTruthy();
    expect(record.summary).toBeTruthy();
    expect(record).not.toHaveProperty('price');
    expect(record).not.toHaveProperty('stock');
    expect(record).not.toHaveProperty('image');
    expect(record).not.toHaveProperty('preorder');
  }
});

for (const [category, model] of categories) {
  test(`/${category} shows real Apple source, not fictitious Nepal stock`, async ({
    page,
  }) => {
    await page.goto(`/${category}`);
    const section = page.locator('[data-apple-reference-section]');
    await expect(section).toBeVisible();
    const card = section.locator(`[data-apple-reference="${model}"]`);
    await expect(card).toBeVisible();
    const source = card.getByRole('link', { name: /Apple specifications/i });
    await expect(source).toHaveAttribute('href', /^https:\/\/www\.apple\.com\//);
    await expect(source).toHaveAttribute('rel', /noopener noreferrer/);
    await expect(card.getByText('Local price & stock not confirmed')).toBeVisible();
    await expect(card.getByRole('link', { name: /buy now/i })).toHaveCount(0);
  });
}

test('homepage and store present six independently sourced device families', async ({ page }) => {
  for (const path of ['/', '/store']) {
    await page.goto(path);
    const section = page.locator('[data-apple-reference-section]');
    await expect(section).toBeVisible();
    await expect(section.locator('.official-apple-model')).toHaveCount(6);
    await expect(section.getByText('Apple.com', { exact: false }).first()).toBeVisible();
  }
});

for (const width of [320, 375, 768, 1440]) {
  test(`official Apple references fit ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/iphone');
    const card = page.locator('[data-apple-reference="iphone-18-pro"]');
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}
