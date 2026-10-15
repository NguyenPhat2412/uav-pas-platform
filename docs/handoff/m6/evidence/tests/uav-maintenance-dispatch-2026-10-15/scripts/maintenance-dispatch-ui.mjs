/** Real UI mutations; API is used only for isolated fixtures and authoritative read-back.
 * Browser plugin not available: existing Playwright/Chromium fallback. No browser state,
 * credentials, tokens, signed URLs, request bodies or query strings are persisted.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const work = process.env.UAV_BROWSER_WORK;
const fixture = JSON.parse(await fs.readFile(path.join(work, 'fixture.json'), 'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080');
const shots = process.env.UAV_BROWSER_SCREENSHOTS;
await fs.mkdir(shots, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const operatorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
for (const context of [adminContext, operatorContext]) { context.setDefaultTimeout(25000); context.setDefaultNavigationTimeout(35000); }
const admin = await adminContext.newPage(), operator = await operatorContext.newPage();
const results = [], network = [], apiCalls = [], pageErrors = [], consoleIssues = [];
const secrets = [fixture.password];
const created = {};
let current = admin, activeCheck, failure;
const unwrap = body => body && typeof body === 'object' && 'data' in body ? body.data : body;
function sanitize(value) { let result = String(value).replace(/https?:\/\/\S+/g, '[URL]'); for (const secret of secrets.filter(Boolean)) result = result.split(secret).join('[REDACTED]'); return result.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED]'); }
for (const page of [admin, operator]) {
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type() }); });
  page.on('pageerror', error => pageErrors.push(sanitize(error.message)));
  page.on('response', response => { const url = new URL(response.url()); if (url.port === '18080') network.push({ method: response.request().method(), path: url.pathname, status: response.status() }); });
}
async function check(name, fn, mode = 'browser UI + API read-back') { activeCheck = name; console.log('START', name); const details = await fn(); results.push({ name, status: 'PASS', mode, ...(details ? { details } : {}) }); console.log('PASS', name); }
async function api(token, route, method = 'GET', body) {
  const response = await fetch(fixture.base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  apiCalls.push({ method, path: new URL(route, fixture.base).pathname, status: response.status });
  assert.ok(response.ok, `API ${method} ${new URL(route, fixture.base).pathname}: HTTP ${response.status}`);
  return response.status === 204 ? undefined : unwrap(await response.json());
}
async function apiLogin(role) { const auth = await api(null, '/api/v1/auth/login', 'POST', { usernameOrEmail: fixture.users[role].username, password: fixture.password }); const token = auth.token || auth.accessToken; assert.ok(token); secrets.push(token, auth.refreshToken); return token; }
async function login(page, role) { current = page; await page.goto('http://localhost:3102/login'); await page.waitForLoadState('networkidle'); await page.locator('input').first().fill(fixture.users[role].username); await page.locator('input[type=password]').fill(fixture.password); await page.locator('button[type=submit]').click(); await page.waitForURL(url => !url.pathname.includes('login')); await page.getByRole('button', { name: /Đăng xuất/ }).waitFor(); }
async function shot(page, name) { await page.screenshot({ path: path.join(shots, `maintenance-dispatch-${name}.png`), fullPage: false }); }
async function missionPage(page) { current = page; await page.goto(`http://localhost:3102/missions/${created.missionId}`); await page.getByRole('heading', { level: 1 }).waitFor(); }
async function mutate(page, button, suffix, method = 'POST') { current = page; const wait = page.waitForResponse(r => new URL(r.url()).pathname.endsWith(suffix) && r.request().method() === method); await page.getByRole('button', { name: button, exact: true }).click(); const response = await wait; assert.ok(response.ok(), `${method} ${suffix}: HTTP ${response.status()}`); const value = unwrap(await response.json()); await page.getByText('Đang xử lý…', { exact: true }).waitFor({ state: 'hidden' }); await page.getByText('Đang cập nhật UAV…', { exact: true }).waitFor({ state: 'hidden' }); return value; }
async function choose(label, id) { const control = admin.getByRole('combobox', { name: label, exact: true }); await control.locator(`option[value="${id}"]`).waitFor({ state: 'attached' }); await control.selectOption(String(id)); }
async function openUav(uav, tab = 'Bảo trì') { current = admin; await admin.goto('http://localhost:3102/uavs'); await admin.getByRole('textbox', { name: /Tìm.*Bảng đội UAV/ }).fill(uav.serialNumber); const row = admin.getByRole('row').filter({ hasText: uav.serialNumber }); await row.getByRole('button', { name: 'Mở chi tiết', exact: true }).click(); await admin.getByRole('dialog', { name: 'Chi tiết UAV' }).waitFor(); await admin.getByRole('tab', { name: tab, exact: true }).click(); }
async function reasonReplace(id, text) { await admin.getByRole('button', { name: 'Thay UAV', exact: true }).click(); await choose('UAV thay thế', id); await admin.getByLabel('Lý do điều phối lại', { exact: false }).fill(text); return mutate(admin, 'Xác nhận thay UAV', '/replace-uav'); }
try {
  let adminToken, customerToken, station, uavs, equipment;
  const tag = Date.now().toString(36);
  await check('create isolated stations, three UAVs, stock and pending mission', async () => {
    adminToken = await apiLogin('admin'); customerToken = await apiLogin('customer');
    station = await api(adminToken, '/api/v1/stations', 'POST', { code: `RD-${tag}`, name: `Trạm điều phối ${tag}`, address: 'Địa điểm kiểm thử tổng hợp' });
    uavs = [];
    for (const suffix of ['A', 'B', 'C']) uavs.push(await api(adminToken, '/api/v1/uavs', 'POST', { serialNumber: `RD-${tag}-${suffix}`, model: `UAV điều phối ${suffix}`, manufacturer: 'Synthetic QA' }));
    equipment = await api(adminToken, '/api/v1/inventory/equipment', 'POST', { name: `Pin điều phối ${tag}`, type: 'BATTERY', serialNumber: `RD-PIN-${tag}`, stationId: station.id });
    await api(adminToken, `/api/v1/inventory/equipment/${equipment.id}/stock-in`, 'POST', { quantity: 7, requestId: randomUUID(), note: 'Synthetic fixture' });
    const date = new Date(Date.UTC(2028, 0, 1) + uavs[0].id * 86400000).toISOString().slice(0, 10);
    const mission = await api(customerToken, '/api/v1/missions', 'POST', { missionType: 'AREA_INSPECTION', title: `Kiểm tra điều phối lại ${tag}`, requestedDate: date, startTime: `${date}T09:00:00`, expectedEndTime: `${date}T10:00:00`, locationName: 'Khu vực kiểm thử UAV', priority: 'NORMAL' });
    await api(customerToken, `/api/v1/missions/${mission.id}/submit`, 'POST');
    Object.assign(created, { missionId: mission.id, stationId: station.id, uavIds: uavs.map(uav => uav.id), equipmentId: equipment.id });
    return created;
  }, 'API fixture setup; not UI coverage');
  await check('admin login renders identified Operations page without framework overlay', async () => { await login(admin, 'admin'); assert.match(await admin.title(), /UAV/i); assert.ok((await admin.locator('body').innerText()).length > 150); assert.equal(await admin.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(), 0); await shot(admin, 'desktop-first-viewport'); }, 'browser UI');
  await check('station assignment keeps the UAV available for mission use', async () => {
    await openUav(uavs[0], 'Điều phối'); await admin.getByLabel('Trạm điều chuyển').selectOption(String(station.id));
    const uav = await mutate(admin, 'Xác nhận gán trạm', `/station/${station.id}`, 'PUT');
    assert.equal(uav.status, 'AVAILABLE'); assert.equal(uav.stationId, station.id); await admin.getByText('Đã cập nhật trạm. UAV vẫn sẵn có để phân công.').waitFor();
  });
  await check('maintenance requires reason, confirmation can cancel without a mutation', async () => {
    await admin.getByRole('tab', { name: 'Bảo trì', exact: true }).click(); await admin.getByRole('button', { name: 'Đưa vào bảo trì', exact: true }).click();
    assert.equal(await admin.getByRole('button', { name: 'Xác nhận bảo trì', exact: true }).isDisabled(), true);
    await admin.getByLabel('Lý do bảo trì').fill('Kiểm tra cánh quạt và pin'); await admin.getByRole('button', { name: 'Quay lại', exact: true }).click();
    assert.equal(network.filter(item => item.path.endsWith('/maintenance') && item.method === 'POST').length, 0);
    assert.equal((await api(adminToken, `/api/v1/uavs/${uavs[0].id}`)).status, 'AVAILABLE');
  });
  await check('maintenance entry and completion persist reasons and availability', async () => {
    await admin.getByRole('button', { name: 'Đưa vào bảo trì', exact: true }).click(); await admin.getByLabel('Lý do bảo trì').fill('Kiểm tra cánh quạt và pin');
    assert.equal((await mutate(admin, 'Xác nhận bảo trì', '/maintenance')).status, 'MAINTENANCE');
    await admin.getByRole('dialog').getByRole('button', { name: 'Hoàn tất bảo trì', exact: true }).click();
    assert.equal(await admin.getByRole('button', { name: 'Xác nhận hoàn tất bảo trì', exact: true }).isDisabled(), true);
    await admin.getByLabel('Kết quả kiểm tra sau bảo trì').fill('Đã kiểm tra, đủ điều kiện hoạt động.');
    assert.equal((await mutate(admin, 'Xác nhận hoàn tất bảo trì', '/status', 'PUT')).status, 'AVAILABLE');
    await admin.getByRole('tab', { name: 'Hoạt động', exact: true }).click();
    await admin.getByText(/Kiểm tra cánh quạt và pin/).waitFor(); await admin.getByText(/Đã kiểm tra, đủ điều kiện hoạt động/).waitFor();
    await shot(admin, 'maintenance-history');
  });
  await check('confirm, assign UAV and reserve two items while mission remains CONFIRMED', async () => {
    await missionPage(admin); assert.equal((await mutate(admin, 'Xác nhận', '/confirm')).status, 'CONFIRMED');
    await choose('Trạm', station.id); await mutate(admin, 'Gán trạm', '/assign-station');
    await choose('UAV', uavs[0].id); await mutate(admin, 'Gán uav', '/assign-uav');
    await choose('Thiết bị', equipment.id); await admin.getByRole('spinbutton', { name: 'Số lượng giữ' }).fill('2'); assert.equal((await mutate(admin, 'Giữ thiết bị', '/reserve-equipment')).status, 'CONFIRMED');
  });
  await check('redispatch cancel preserves original UAV; replacement requires a reason', async () => {
    await admin.getByRole('button', { name: 'Thay UAV', exact: true }).click(); await choose('UAV thay thế', uavs[1].id);
    assert.equal(await admin.getByRole('button', { name: 'Xác nhận thay UAV', exact: true }).isDisabled(), true);
    await admin.getByLabel('Lý do điều phối lại', { exact: false }).fill('Kiểm tra xác nhận trước khi thay');
    await admin.getByRole('button', { name: 'Giữ nguyên UAV', exact: true }).click();
    assert.equal((await api(adminToken, `/api/v1/missions/${created.missionId}`)).uavId, uavs[0].id);
    assert.equal(network.filter(item => item.path.endsWith('/replace-uav')).length, 0);
  });
  await check('CONFIRMED replacement atomically releases old UAV and preserves other resources', async () => {
    const mission = await reasonReplace(uavs[1].id, 'Thay UAV để kiểm tra thêm cánh quạt.');
    assert.equal(mission.uavId, uavs[1].id); assert.equal(mission.status, 'CONFIRMED'); assert.equal(mission.stationId, station.id);
    assert.equal((await api(adminToken, `/api/v1/uavs/${uavs[0].id}`)).status, 'AVAILABLE');
    assert.equal((await api(adminToken, `/api/v1/uavs/${uavs[1].id}`)).status, 'ASSIGNED');
    const stock = await api(adminToken, `/api/v1/inventory/equipment/${equipment.id}`); assert.equal(stock.reservedQuantity, 2); assert.equal(stock.availableQuantity, 5);
    await admin.locator('#timeline').getByText(/Thay UAV để kiểm tra thêm cánh quạt/).waitFor(); await shot(admin, 'confirmed-replacement');
  });
  await check('released old UAV can enter maintenance; assigned UAV offers no maintenance or station transfer', async () => {
    await openUav(uavs[0]); await admin.getByRole('button', { name: 'Đưa vào bảo trì', exact: true }).click(); await admin.getByLabel('Lý do bảo trì').fill('Kiểm tra sau khi điều phối UAV thay thế.');
    assert.equal((await mutate(admin, 'Xác nhận bảo trì', '/maintenance')).status, 'MAINTENANCE');
    await openUav(uavs[1]); assert.equal(await admin.getByRole('button', { name: 'Đưa vào bảo trì', exact: true }).count(), 0); await admin.getByText(/Cần đổi hoặc gỡ UAV trong nhiệm vụ/).waitFor();
    await admin.getByRole('tab', { name: 'Điều phối', exact: true }).click(); assert.equal(await admin.getByLabel('Trạm điều chuyển').count(), 0);
    await shot(admin, 'busy-uav-guard');
  });
  let operatorId;
  await check('assign operator and accept through separate operator browser session', async () => {
    await missionPage(admin); const select = admin.getByRole('combobox', { name: 'Người vận hành', exact: true }); const option = select.locator('option').filter({ hasText: fixture.users.operator.username }); await option.waitFor({ state: 'attached' }); operatorId = Number(await option.getAttribute('value')); await select.selectOption(String(operatorId));
    assert.equal((await mutate(admin, 'Gán người vận hành', '/assign-operator')).status, 'RESOURCE_RESERVED');
    await login(operator, 'operator'); await missionPage(operator); assert.equal(await operator.getByRole('button', { name: 'Thay UAV', exact: true }).count(), 0); assert.equal((await mutate(operator, 'Nhận nhiệm vụ', '/accept')).operatorAccepted, true);
    await missionPage(admin); assert.equal((await mutate(admin, 'Sẵn sàng', '/ready')).status, 'READY');
  });
  await check('READY replacement returns to RESOURCE_RESERVED and resets acceptance, preserving operator and equipment', async () => {
    const mission = await reasonReplace(uavs[2].id, 'Cần thay UAV trước giờ khởi hành.'); assert.equal(mission.status, 'RESOURCE_RESERVED'); assert.equal(mission.uavId, uavs[2].id); assert.equal(mission.operatorAccepted, false); assert.equal(mission.operatorId, operatorId); assert.equal(mission.stationId, station.id); assert.ok(!mission.operatorConflictNote);
    assert.equal((await api(adminToken, `/api/v1/inventory/equipment/${equipment.id}`)).reservedQuantity, 2);
    assert.equal((await api(adminToken, `/api/v1/uavs/${uavs[1].id}`)).status, 'AVAILABLE');
    await missionPage(operator); await operator.getByRole('button', { name: 'Nhận nhiệm vụ', exact: true }).waitFor(); assert.equal(await operator.getByRole('button', { name: 'Bắt đầu', exact: true }).count(), 0);
  });
  await check('mobile redispatch form stays within viewport and can dismiss', async () => {
    current = admin; await admin.setViewportSize({ width: 375, height: 812 }); await admin.getByRole('button', { name: 'Gỡ UAV khỏi nhiệm vụ', exact: true }).click(); await admin.getByLabel('Lý do điều phối lại', { exact: false }).fill('Chuẩn bị kiểm tra UAV');
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); await admin.getByRole('form', { name: 'Gỡ UAV của nhiệm vụ' }).scrollIntoViewIfNeeded(); await shot(admin, 'mobile-unassign-confirmation');
    await admin.getByRole('button', { name: 'Giữ nguyên UAV', exact: true }).click(); assert.equal((await api(adminToken, `/api/v1/missions/${created.missionId}`)).uavId, uavs[2].id); await admin.setViewportSize({ width: 1440, height: 1000 });
  });
  await check('unassign returns to CONFIRMED without releasing equipment or other assignments', async () => {
    await admin.getByRole('button', { name: 'Gỡ UAV khỏi nhiệm vụ', exact: true }).click(); await admin.getByLabel('Lý do điều phối lại', { exact: false }).fill('Gỡ UAV để bố trí lại theo kế hoạch.');
    const mission = await mutate(admin, 'Xác nhận gỡ UAV', '/unassign-uav'); assert.equal(mission.status, 'CONFIRMED'); assert.ok(!mission.uavId); assert.equal(mission.stationId, station.id); assert.equal(mission.operatorId, operatorId); assert.equal(mission.operatorAccepted, false);
    assert.equal((await api(adminToken, `/api/v1/inventory/equipment/${equipment.id}`)).reservedQuantity, 2); assert.equal((await api(adminToken, `/api/v1/uavs/${uavs[2].id}`)).status, 'AVAILABLE');
    await admin.getByRole('combobox', { name: 'UAV', exact: true }).waitFor(); assert.equal(await admin.getByRole('button', { name: 'Sẵn sàng', exact: true }).count(), 0); await admin.locator('#timeline').getByText(/Gỡ UAV để bố trí lại/).waitFor();
  });
  await check('existing assign action restores resources; operator accepts, starts and completes redistributed mission', async () => {
    await choose('UAV', uavs[1].id); assert.equal((await mutate(admin, 'Gán uav', '/assign-uav')).status, 'RESOURCE_RESERVED');
    await missionPage(operator); assert.equal((await mutate(operator, 'Nhận nhiệm vụ', '/accept')).operatorAccepted, true);
    await missionPage(admin); await mutate(admin, 'Sẵn sàng', '/ready'); await missionPage(operator); assert.equal((await mutate(operator, 'Bắt đầu', '/start')).status, 'IN_PROGRESS');
    await missionPage(admin); assert.equal(await admin.getByRole('button', { name: 'Thay UAV', exact: true }).count(), 0); assert.equal(await admin.getByRole('button', { name: 'Gỡ UAV khỏi nhiệm vụ', exact: true }).count(), 0);
    current = operator; await operator.getByRole('button', { name: 'Hoàn tất', exact: true }).click(); await operator.getByLabel('Ghi chú kết quả (tùy chọn)').fill('Đã hoàn tất sau khi điều phối lại UAV.'); assert.equal((await mutate(operator, 'Xác nhận hoàn tất', '/complete')).status, 'COMPLETED');
    const stock = await api(adminToken, `/api/v1/inventory/equipment/${equipment.id}`); assert.equal(stock.reservedQuantity, 0); assert.equal(stock.availableQuantity, 7); assert.equal((await api(adminToken, `/api/v1/uavs/${uavs[1].id}`)).status, 'AVAILABLE');
    await shot(operator, 'redistributed-completed');
  });
  await check('mobile maintenance confirmation stays within viewport', async () => {
    await admin.setViewportSize({ width: 375, height: 812 }); await openUav(uavs[0]); await admin.getByRole('dialog').getByRole('button', { name: 'Hoàn tất bảo trì', exact: true }).click(); await admin.getByLabel('Kết quả kiểm tra sau bảo trì').fill('Kiểm tra mobile, chưa xác nhận');
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); const dialog = admin.getByRole('dialog'); assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true); await admin.getByRole('form', { name: 'Xác nhận hoàn tất bảo trì UAV' }).scrollIntoViewIfNeeded(); await shot(admin, 'mobile-maintenance'); await admin.getByRole('button', { name: 'Quay lại', exact: true }).click();
  });
  await check('no unexpected browser exceptions, console errors or failed API responses', async () => { assert.deepEqual(pageErrors, []); assert.deepEqual(consoleIssues, []); assert.deepEqual(network.filter(item => item.status >= 400), []); }, 'browser health');
} catch (error) {
  failure = { check: activeCheck, message: sanitize(error.message) }; console.log('FAIL', failure.check, failure.message); process.exitCode = 1;
  if (current && !new URL(current.url()).pathname.includes('login')) await shot(current, 'failure').catch(() => {});
} finally {
  await fs.writeFile(path.join(work, 'maintenance-dispatch-ui-result.json'), JSON.stringify({ status: failure ? 'FAIL' : 'PASS', browserFallback: 'Browser plugin not available', results, failure, created, pageErrors, consoleIssues, network, apiCalls }, null, 2));
  await browser.close();
}
