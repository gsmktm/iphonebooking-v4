import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('appearance persists across routes and tabs, and system mode follows the device', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByLabel('Appearance', { exact: true }).selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.getByLabel('Appearance', { exact: true })).toHaveValue('light');
  const other = await context.newPage();
  await other.goto('/store');
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Appearance', { exact: true }).selectOption('system');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByLabel('Appearance', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await other.close();
});

for (const theme of ['light', 'dark']) {
  test(`homepage supports accessible ${theme} mode`, async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Appearance', { exact: true }).selectOption(theme);
    await page.locator('.quick-config').waitFor();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  });
}
