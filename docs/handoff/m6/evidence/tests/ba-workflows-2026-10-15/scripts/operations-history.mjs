/** Real server-pagination checks. API setup seeds only new unused resources.
 * Status-history setup repeats AVAILABLE on its dedicated UAV; no maintenance,
 * mission resources, production data, browser storage, or secrets are exported.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const work = process.env.UAV_BROWSER_WORK || path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(await fs.readFile(path.join(work, 'fixture.json'), 'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080');
const shots = process.env.UAV_BROWSER_SCREENSHOTS || path.join(work, 'screenshots');
await fs.mkdir(shots, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(25000); context.setDefaultNavigationTimeout(35000);
const page = await context.newPage();
const results = [], network = [], apiCalls = [], pageErrors = [], consoleIssues = [];
const secrets = [fixture.password], created = {};
let token, activeCheck, failure;
const unwrap = value => value && typeof value === 'object' && 'data' in value ? value.data : value;
function sanitize(value) {
  let text = String(value).replace(/https?:\/\/\S+/g, '[URL]');
  for (const secret of secrets.filter(Boolean)) text = text.split(secret).join('[REDACTED]');
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED]');
}
page.on('pageerror', error => pageErrors.push(sanitize(error.message)));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type() }); });
page.on('response', response => {
  const url = new URL(response.url());
  if (url.port === '18080') network.push({ method: response.request().method(), path: url.pathname, page: url.searchParams.get('page'), size: url.searchParams.get('size'), status: response.status() });
});
async function api(route, method = 'GET', body) {
  const response = await fetch(fixture.base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  apiCalls.push({ method, path: new URL(route, fixture.base).pathname, status: response.status });
  assert.ok(response.ok, `API ${method} ${new URL(route, fixture.base).pathname}: HTTP ${response.status}`);
  return response.status === 204 ? undefined : unwrap(await response.json());
}
async function check(name, fn, mode = 'browser UI') {
  activeCheck = name; console.log('START', name);
  const details = await fn(); results.push({ name, status: 'PASS', mode, ...(details ? { details } : {}) }); console.log('PASS', name);
}
async function snapshot(name) { await page.screenshot({ path: path.join(shots, `operations-history-${name}.png`), fullPage: !name.endsWith('mobile') }); }
function responsePage(route, index) {
  const pending = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === route && url.searchParams.get('page') === String(index) && response.request().method() === 'GET';
  }).then(async response => { assert.ok(response.ok()); return unwrap(await response.json()); });
  pending.catch(() => {});
  return pending;
}
async function testPagination(scope, route, first, verifyPage, screenshotPrefix) {
  assert.ok(first.totalPages >= 2, 'Fixture must have more than one history page');
  const pages = new Map([[0, first]]);
  await scope.getByText(`1 / ${first.totalPages}`, { exact: true }).waitFor();
  assert.equal(await scope.getByRole('button', { name: 'Trước', exact: true }).isDisabled(), true);
  await verifyPage(first);
  let cursor = 0;
  while (cursor + 1 < first.totalPages) {
    const pending = responsePage(route, cursor + 1);
    await scope.getByRole('button', { name: 'Sau', exact: true }).click();
    const next = await pending; cursor += 1; pages.set(cursor, next);
    await scope.getByText(`${cursor + 1} / ${first.totalPages}`, { exact: true }).waitFor();
    await verifyPage(next);
  }
  assert.equal(await scope.getByRole('button', { name: 'Sau', exact: true }).isDisabled(), true);
  await snapshot(`${screenshotPrefix}-last-page`);
  // Previously visited pages can come from React Query cache; inspect UI, not a
  // fictitious requirement to make another request for cached pages.
  while (cursor > 0) {
    await scope.getByRole('button', { name: 'Trước', exact: true }).click(); cursor -= 1;
    await scope.getByText(`${cursor + 1} / ${first.totalPages}`, { exact: true }).waitFor();
    await verifyPage(pages.get(cursor));
  }
  assert.equal(await scope.getByRole('button', { name: 'Trước', exact: true }).isDisabled(), true);
  assert.ok(network.some(item => item.path === route && item.page === '1' && item.size === '20' && item.status === 200), 'The next history page must reach the server');
  return { totalElements: first.totalElements, totalPages: first.totalPages, visitedPages: [...pages.keys()], rowCounts: [...pages.values()].map(item => item.content.length) };
}

try {
  const tag = Date.now().toString(36);
  await check('API setup: seed dedicated unused equipment and UAV histories over 20 entries', async () => {
    const auth = await api('/api/v1/auth/login', 'POST', { usernameOrEmail: fixture.users.admin.username, password: fixture.password });
    token = auth.accessToken || auth.token; assert.ok(token); secrets.push(token, auth.refreshToken);
    const equipment = await api('/api/v1/inventory/equipment', 'POST', { name: `Kho phân trang ${tag}`, type: 'BATTERY', serialNumber: `HIST-PIN-${tag}` });
    const uav = await api('/api/v1/uavs', 'POST', { model: `UAV phân trang ${tag}`, serialNumber: `HIST-UAV-${tag}`, manufacturer: 'Synthetic QA' });
    Object.assign(created, { equipmentId: equipment.id, uavId: uav.id, serialNumber: uav.serialNumber, model: uav.model });
    for (let index = 1; index <= 25; index++) {
      await api(`/api/v1/inventory/equipment/${equipment.id}/stock-in`, 'POST', { quantity: 1, note: `Lịch sử kho tổng hợp ${String(index).padStart(2, '0')}`, requestId: randomUUID() });
    }
    for (let index = 1; index <= 24; index++) {
      await api(`/api/v1/uavs/${uav.id}/status?status=AVAILABLE&reason=${encodeURIComponent(`Lịch sử UAV tổng hợp ${String(index).padStart(2, '0')}`)}`, 'PUT');
    }
    assert.equal((await api(`/api/v1/uavs/${uav.id}`)).status, 'AVAILABLE');
    return { equipmentId: equipment.id, uavId: uav.id, inventoryMovementsSeeded: 25, uavHistoryEntriesSeeded: 24, finalUavStatus: 'AVAILABLE' };
  }, 'API setup only; not UI mutation coverage');
  await check('admin logs in to Operations UI', async () => {
    await page.goto('http://localhost:3102/login'); await page.waitForLoadState('networkidle');
    await page.locator('input').first().fill(fixture.users.admin.username); await page.locator('input[type=password]').fill(fixture.password);
    await page.locator('button[type=submit]').click(); await page.waitForURL(url => !url.pathname.includes('login'));
    await page.getByRole('button', { name: /Đăng xuất/ }).waitFor();
  });
  await check('inventory history next/previous pages, server page one, content and disabled boundaries', async () => {
    const route = '/api/v1/inventory/equipment/history';
    const initial = responsePage(route, 0); await page.goto('http://localhost:3102/inventory'); const first = await initial;
    const section = page.getByRole('region', { name: 'Lịch sử kho', exact: true });
    return testPagination(section, route, first, async result => {
      assert.equal(await section.locator('tbody tr').count(), result.content.length);
      const firstRow = section.locator('tbody tr').first();
      assert.equal(await firstRow.locator('td').nth(1).innerText(), result.content[0].equipmentName);
      assert.equal(await firstRow.locator('td').nth(6).innerText(), result.content[0].note || '—');
    }, 'inventory');
  });
  await check('inventory history on mobile keeps horizontal scrolling within the table', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    const section = page.getByRole('region', { name: 'Lịch sử kho', exact: true }); await section.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await section.getByRole('button', { name: 'Sau', exact: true }).click();
    await section.getByText(/^2 \/ \d+$/, { exact: true }).waitFor();
    assert.equal(await section.getByRole('button', { name: 'Trước', exact: true }).isEnabled(), true);
    await snapshot('inventory-mobile');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check('UAV history next/previous pages, server page one, content and disabled boundaries', async () => {
    await page.goto('http://localhost:3102/uavs');
    await page.getByRole('textbox', { name: /Tìm.*Bảng đội UAV/ }).fill(created.serialNumber);
    const route = `/api/v1/uavs/${created.uavId}/history`; const initial = responsePage(route, 0);
    await page.getByRole('button', { name: 'Mở chi tiết', exact: true }).click(); const first = await initial;
    const drawer = page.getByRole('dialog', { name: 'Chi tiết UAV', exact: true });
    await drawer.getByRole('tab', { name: 'Hoạt động', exact: true }).click();
    assert.equal(first.totalElements, 25);
    return testPagination(drawer, route, first, async result => {
      const entries = drawer.locator('.border-b');
      assert.equal(await entries.count(), result.content.length);
      assert.ok((await entries.first().innerText()).includes(result.content[0].reason));
    }, 'uav');
  });
  await check('UAV history mobile drawer pagination remains usable', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    const drawer = page.getByRole('dialog', { name: 'Chi tiết UAV', exact: true });
    await drawer.getByRole('button', { name: 'Sau', exact: true }).click();
    await drawer.getByText('2 / 2', { exact: true }).waitFor();
    assert.equal(await drawer.getByRole('button', { name: 'Sau', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const bounds = await drawer.boundingBox(); assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= 376);
    await snapshot('uav-mobile');
    await drawer.getByRole('button', { name: 'Trước', exact: true }).click(); await drawer.getByText('1 / 2', { exact: true }).waitFor();
  });
  await check('history browser checks have no API failures, page errors or console warnings', async () => {
    assert.deepEqual(network.filter(item => item.status >= 400), []); assert.deepEqual(pageErrors, []); assert.deepEqual(consoleIssues, []);
  });
} catch (error) {
  failure = { check: activeCheck, message: sanitize(error.message) }; results.push({ name: activeCheck || 'setup', status: 'FAIL', error: failure.message });
  console.log('FAIL', failure.check, failure.message); process.exitCode = 1;
  if (!new URL(page.url()).pathname.includes('login')) await snapshot('failure').catch(() => {});
} finally {
  await fs.writeFile(path.join(work, 'operations-history-result.json'), JSON.stringify({ status: failure ? 'FAIL' : 'PASS', created, results, failure, pageErrors, consoleIssues, network, apiCalls }, null, 2));
  await browser.close(); console.log(failure ? 'FAILED' : 'COMPLETE', results.filter(item => item.status === 'PASS').length, 'checks');
}
