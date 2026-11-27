import { expect, test } from '@playwright/test';

const families = [
  ['iphone', 'IPHONE COLLECTION', 'The future of'],
  ['mac', 'MAC COLLECTION', 'Power for'],
  ['ipad', 'IPAD COLLECTION', 'A canvas'],
  ['watch', 'APPLE WATCH COLLECTION', 'Every'],
  ['airpods', 'AIRPODS COLLECTION', 'Hear every'],
  ['accessories', 'ACCESSORIES COLLECTION', 'The perfect'],
] as const;

for (const [route, eyebrow, heading] of families) {
  test(`/${route}: distinctive black-gold hero with genuine-photo-only policy`, async ({ page }) => {
    await page.goto(`/${route}`);
    const hero = page.locator(`.cinematic-category--${route}`);
    await expect(hero).toBeVisible();
    await expect(hero.getByText(eyebrow, { exact: true })).toBeVisible();
    await expect(hero.getByRole('heading', { level: 1 })).toContainText(heading);
    await expect(hero.getByRole('link', { name: 'Compare devices' })).toHaveAttribute('href', '/compare');
    const realPhoto = hero.locator('.cinematic-category-real-photo img');
    if (await realPhoto.count()) {
      const src = await realPhoto.getAttribute('src');
      expect(src).toMatch(/^\/(?:images|uploads)\//);
      expect(src).not.toMatch(/(?:catalog|hero|himalayas)\.(webp|png|jpe?g)$/);
      expect(await realPhoto.getAttribute('alt')).toBeTruthy();
    } else {
      await expect(hero.locator(`.home-device-frame--${route}`)).toBeVisible();
      await expect(hero.getByText('Product photograph available with published listings')).toBeVisible();
      await expect(hero.locator('.cinematic-category-price-tag')).toHaveCount(0);
    }
  });
}

for (const width of [320, 375, 768, 1440]) {
  test(`cinematic hero stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['iphone', 'mac', 'watch']) {
      await page.goto(`/${route}`);
      await expect(page.locator('.cinematic-category')).toBeVisible();
      await expect(page.locator('.cinematic-category-primary')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow, `${route} should not overflow at ${width}px`).toBe(false);
    }
  });
}
