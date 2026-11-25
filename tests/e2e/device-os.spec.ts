import { test, expect, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
config({ quiet: true });
const headers = { 'X-Requested-With': 'iPhoneBooking', Origin: 'http://localhost:5173' };
async function post(client: APIRequestContext, path: string, data: unknown) {
  const response = await client.post(`/api/v1${path}`, { headers, data });
  expect(response.ok(), `${path}: HTTP ${response.status()}`).toBe(true);
  return response.json();
}
async function stage(client: APIRequestContext, id: string, status: string) {
  const response = await client.patch(`/api/v1/admin/repairs/${id}/status`, {
    headers,
    data: { status, note: `Browser test: ${status}` },
  });
  expect(response.ok(), `Repair stage ${status}`).toBe(true);
}
test('customer passport and staff QC connect to the same purchased device', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180000);
  test.skip(!process.env.ADMIN_PASSWORD, 'Requires the local development admin.');
  if (process.env.NODE_ENV === 'production' || baseURL !== 'http://localhost:5173')
    throw new Error('Browser fixture may only run against the local development storefront.');
  const customer = await browser.newContext({ baseURL });
  const staff = await browser.newContext({ baseURL });
  try {
    const suffix = randomUUID();
    const email = `browser-device-${suffix}@example.test`;
    await post(customer.request, '/auth/register', {
      name: 'Browser Device Test',
      email,
      password: `Test-${randomUUID()}`,
    });
    const staffUser = await post(staff.request, '/auth/login', {
      email: process.env.ADMIN_EMAIL ?? 'admin@iphonebooking.local',
      password: process.env.ADMIN_PASSWORD,
    });
    const response = await customer.request.get('/api/v1/products');
    const products = (await response.json()) as {
      name: string;
      variants: { id: string; stock: { available: number }[] }[];
    }[];
    const product = products.find((p) =>
      p.variants.some((v) => v.stock.some((s) => s.available > 0)),
    )!;
    const variant = product.variants.find((v) => v.stock.some((s) => s.available > 0))!;
    const order = await post(customer.request, '/orders', {
      items: [{ variantId: variant.id, quantity: 1 }],
      name: 'Browser Device Test',
      email,
      phone: '9800000000',
      fulfillment: 'PICKUP',
      address: {
        province: 'Bagmati',
        district: '',
        municipality: '',
        ward: '',
        area: '',
        landmark: '',
      },
      idempotencyKey: randomUUID(),
      termsAccepted: true,
    });
    const unit = await post(staff.request, '/admin/units', {
      variantId: variant.id,
      stockId: order.items[0].stockId,
      serial: `BROWSER-${suffix.slice(0, 24)}`,
    });
    await post(staff.request, `/admin/orders/${order.id}/collect`, {
      amount: order.total,
      reference: `BROWSER-TEST-${suffix}`,
    });
    await post(staff.request, `/admin/orders/${order.id}/allocate`, { unitIds: [unit.id] });
    await post(staff.request, `/admin/orders/${order.id}/fulfill`, { unitIds: [unit.id] });
    const devices = await (await customer.request.get('/api/v1/account/devices')).json();
    const device = devices[0];
    const page = await customer.newPage();
    await page.goto('/account/devices');
    await page.getByRole('link', { name: 'Open device passport' }).click();
    await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
    await expect(page.getByText(unit.canonicalId, { exact: true })).toBeVisible();
    await expect(page.locator('.timeline')).toContainText('Sold');
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      axe.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    for (const width of [375, 414, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
    const repair = await post(customer.request, '/repairs', {
      model: product.name,
      deviceId: device.id,
      issue: 'Battery',
      description: 'Browser test: diagnose battery issue.',
      method: 'STORE',
    });
    const adminPage = await staff.newPage();
    await adminPage.goto(`/admin/repairs?q=${repair.id}`);
    await adminPage.getByRole('button', { name: 'View', exact: true }).click();
    await adminPage.getByRole('button', { name: 'Assign technician', exact: true }).click();
    const assignment = adminPage.getByRole('dialog', { name: 'Assign technician' });
    await assignment.getByLabel('Find technician').fill(staffUser.name);
    await assignment.getByRole('button', { name: 'Search staff' }).click();
    await assignment.getByLabel('Assigned technician', { exact: true }).selectOption(staffUser.id);
    await assignment
      .getByLabel('Assignment reason')
      .fill('Browser fixture: assign the verified service operator.');
    await assignment.getByRole('button', { name: 'Confirm technician' }).click();
    await expect(assignment).not.toBeVisible();
    for (const status of ['RECEIVED', 'INSPECTION', 'DIAGNOSIS'])
      await stage(staff.request, repair.id, status);
    const quote = await post(staff.request, `/admin/repairs/${repair.id}/quote`, {
      diagnosis: 'Browser test: battery calibration and diagnostics.',
      parts: 0,
      labor: 10000,
      warrantyDays: 90,
    });
    await post(customer.request, `/repairs/${repair.id}/quotes/${quote.id}/decision`, {
      accept: true,
    });
    for (const status of ['REPAIR_IN_PROGRESS', 'QUALITY_CONTROL'])
      await stage(staff.request, repair.id, status);
    await adminPage.goto(`/admin/repairs?q=${repair.id}`);
    await adminPage.getByRole('button', { name: 'View', exact: true }).click();
    await adminPage.getByRole('button', { name: 'Record quality checks' }).click();
    const dialog = adminPage.getByRole('dialog', { name: 'Repair quality control' });
    await expect(dialog.getByLabel('Power', { exact: true })).toBeVisible();
    for (const select of await dialog.locator('select').all()) await select.selectOption('pass');
    await dialog.getByLabel('Inspection notes').fill('Browser test: all functional checks passed.');
    const [qcResponse] = await Promise.all([
      adminPage.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/v1/admin/repairs/${repair.id}/qc`) &&
          response.request().method() === 'POST',
      ),
      dialog.getByRole('button', { name: 'Record QC results' }).click(),
    ]);
    expect(
      qcResponse.ok(),
      'The server must accept all quality checks before the form closes.',
    ).toBe(true);
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    expect(await adminPage.evaluate(() => document.body.style.overflow)).toBe('');
    for (const status of ['READY', 'COMPLETED']) await stage(staff.request, repair.id, status);
    await page.reload();
    await expect(page.getByText(/Repair warranty through/)).toBeVisible();
    await page.screenshot({ path: '/tmp/iphonebooking-device-passport.png', fullPage: true });
  } finally {
    await customer.close();
    await staff.close();
  }
});
