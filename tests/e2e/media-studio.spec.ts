import { expect, test } from '@playwright/test';

for (const path of ['/admin/product-studio', '/admin/history-studio', '/admin/media-library']) {
  test('image management requires a signed-in staff account: ' + path, async ({ page }) => {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: /sign in|welcome back|account/i }).first(),
    ).toBeVisible();
    await expect(page.locator('.studio-uploader')).toHaveCount(0);
  });
}

test('guest cannot upload binary image media to admin API', async ({ request }) => {
  const response = await request.post('/api/v1/admin/media/uploads', {
    headers: { 'Content-Type': 'image/jpeg', 'X-Requested-With': 'iPhoneBooking' },
    data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(12).fill(0)]),
  });
  expect(response.status()).toBe(401);
});

test('guest cannot mutate an Apple history record', async ({ request }) => {
  const response = await request.patch('/api/v1/admin/studio/history/fake-id', {
    headers: { 'X-Requested-With': 'iPhoneBooking' },
    data: { name: 'Tampered' },
  });
  expect(response.status()).toBe(401);
});
