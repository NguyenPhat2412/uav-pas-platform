import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
const output = process.env.QA_EVIDENCE_DIR || '/tmp/uav-access-qa';
await mkdir(output, { recursive: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const errors = [];
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const admin = { id: 1, username: 'access_manager', role: 'ROLE_ADMIN', status: 'ACTIVE', email: 'manager@example.test' };
const pilot = { id: 2, username: 'sample_pilot', role: 'ROLE_PILOT', status: 'ACTIVE', email: 'pilot@example.test' };
const codes = ['STATION_READ', 'STATION_MANAGE', 'PERMISSION_MANAGE'];
const overrides = new Map();
const writes = [];
await context.addInitScript(() => localStorage.setItem('token', 'isolated-ui-test-token'));
await context.route('**/api/v1/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  let body;
  if (path === '/api/v1/auth/me') body = admin;
  else if (path === '/api/v1/permissions/me') body = [...codes, 'USER_READ'];
  else if (path === '/api/v1/users') body = { content: [admin, pilot], totalElements: 2, totalPages: 1 };
  else if (path === '/api/v1/permissions') body = codes.map(code => ({ code }));
  else if (path === '/api/v1/role-templates') body = [
    { role: 'ROLE_ADMIN', name: 'Admin', permissions: codes },
    { role: 'ROLE_PILOT', name: 'Pilot', permissions: ['STATION_READ'] },
  ];
  else if (/\/permissions\/users\/\d+$/.test(path)) body = [...overrides].map(([code, granted]) => ({ code, granted }));
  else if (path.startsWith('/api/v1/permissions/users/')) {
    const code = path.split('/').at(-1);
    writes.push({ code, method: request.method(), granted: url.searchParams.get('granted') });
    if (code === 'PERMISSION_MANAGE') return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'LAST_ACCESS_MANAGER: retain an active access manager' }) });
    if (request.method() === 'DELETE') overrides.delete(code);
    else overrides.set(code, url.searchParams.get('granted') === 'true');
    return route.fulfill({ status: 204 });
  } else return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
try {
  await page.goto(`${process.env.QA_URL || 'http://127.0.0.1:3103'}/access-control`);
  await page.getByRole('heading', { name: 'Quản lý người dùng và quyền', exact: true }).waitFor();
  await page.getByRole('combobox', { name: 'Chọn người dùng', exact: true }).selectOption('1');
  const recovery = page.getByRole('checkbox', { name: 'PERMISSION_MANAGE', exact: true });
  await recovery.waitFor();
  await recovery.click();
  await page.getByRole('alert').filter({ hasText: 'LAST_ACCESS_MANAGER' }).waitFor({ timeout: 5000 });
  assert.equal(await recovery.isChecked(), true, 'Rejected mutation must preserve effective permission');
  console.log('PASS last-manager rejection is visible and permission remains granted');
  await page.screenshot({ path: `${output}/access-rejected.png` });
  await page.getByRole('combobox', { name: 'Chọn người dùng', exact: true }).selectOption('2');
  await page.getByText('Kế thừa template', { exact: true }).first().waitFor();
  const read = page.getByRole('checkbox', { name: 'STATION_READ', exact: true });
  assert.equal(await read.isChecked(), true);
  await read.click();
  await page.getByText('Override: DENY', { exact: true }).waitFor();
  assert.equal(await read.isChecked(), false);
  await page.getByRole('button', { name: 'Reset template STATION_READ', exact: true }).click();
  await page.getByRole('button', { name: 'Reset template STATION_READ', exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await read.isChecked(), true);
  await page.getByRole('checkbox', { name: 'STATION_MANAGE', exact: true }).click();
  await page.getByText('Override: ALLOW', { exact: true }).waitFor();
  console.log('PASS inherited grant → explicit DENY → reset → ALLOW with distinct labels');
  assert(writes.some(write => write.method === 'DELETE' && write.code === 'STATION_READ'));
  await page.screenshot({ path: `${output}/access-effective.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${output}/access-mobile.png`, fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile page must not overflow horizontally');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('PASS mobile layout and no page errors');
} finally { await browser.close(); }
