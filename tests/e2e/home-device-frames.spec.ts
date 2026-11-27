import { expect, test } from '@playwright/test';

test('homepage presents four recognizable device frames with real product links', async ({ page }) => {
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Four worlds. One destination.' });
  await expect(section).toBeVisible();
  const families = ['iphone', 'mac', 'ipad', 'watch'] as const;
  for (const family of families) {
    const card = section.locator(`[data-device-family="${family}"]`);
    await expect(card, `${family} category should have its own card`).toBeVisible();
    await expect(card.locator(`.home-device-frame--${family}`)).toBeVisible();
    const href = await card.locator('.home-device-family-frame-link').getAttribute('href');
    expect(href).toMatch(new RegExp(`^/(products/[^/]+|${family})$`));
    await expect(card.locator('.home-device-family-details h3')).not.toBeEmpty();
  }
  await expect(section.locator('.home-device-family')).toHaveCount(4);
});

for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
  test(`four device borders stay visible without document overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const section = page.getByRole('region', { name: 'Four worlds. One destination.' });
    await section.scrollIntoViewIfNeeded();
    for (const family of ['iphone', 'mac', 'ipad', 'watch']) {
      const card = section.locator(`[data-device-family="${family}"]`);
      await expect(card).toBeVisible();
      await expect(card.locator('.home-device-frame')).toBeVisible();
    }
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      )
      .toBe(true);
  });
}
