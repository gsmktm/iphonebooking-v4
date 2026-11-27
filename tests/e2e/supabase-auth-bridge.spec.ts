import { expect, test } from '@playwright/test';

const headers = {
  'X-Requested-With': 'iPhoneBooking',
  Origin: 'http://localhost:5173',
};

test('Supabase provider is optional and legacy cookie auth remains available', async ({
  request,
  page,
}) => {
  const capabilities = await request.get('/api/v1/auth/capabilities');
  expect(capabilities.ok()).toBe(true);
  const body = await capabilities.json();
  expect(typeof body.supabaseAuth).toBe('boolean');
  expect(typeof body.passwordReset).toBe('boolean');
  expect(typeof body.emailVerification).toBe('boolean');

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Good to see you.' })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  if (body.supabaseAuth) {
    await page.getByRole('button', { name: 'Use Supabase Auth' }).click();
    await expect(page.getByText('SUPABASE EMAIL AUTH')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use original sign-in' })).toBeVisible();
  } else {
    await expect(page.getByRole('button', { name: 'Use Supabase Auth' })).toHaveCount(0);
    const response = await request.post('/api/v1/auth/supabase/login', {
      headers,
      data: { email: 'nobody@example.test', password: 'unusable-example-password' },
    });
    expect(response.status()).toBe(503);
    const error = await response.json();
    expect(error.error.code).toBe('SUPABASE_AUTH_UNAVAILABLE');
  }
});

test('Supabase signup never bypasses CSRF protection', async ({ request }) => {
  const response = await request.post('/api/v1/auth/supabase/register', {
    data: {
      email: 'nobody@example.test',
      name: 'Never Created',
      password: 'SamplePasswordMustNotBeAccepted',
    },
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).error.code).toBe('CSRF_REJECTED');
});
