/** Opt-in real UI checks against disposable services only.
 * API calls create isolated fixtures and read back authoritative state; mission
 * confirmation, assignment, reservation, rejection, readiness, start and failure
 * are performed through Operations UI. No stored browser state or credentials.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const work = process.env.UAV_BROWSER_WORK || path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(await fs.readFile(path.join(work, 'fixture.json'), 'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080', 'Use the disposable local backend only');
const shots = process.env.UAV_BROWSER_SCREENSHOTS || path.join(work, 'screenshots');
await fs.mkdir(shots, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const results = [], network = [], apiCalls = [], pageErrors = [], consoleIssues = [];
const secrets = [fixture.password];
const created = {};
let current, activeCheck, failure;
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const operatorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
for (const context of [adminContext, operatorContext]) {
  context.setDefaultTimeout(25000);
  context.setDefaultNavigationTimeout(35000);
}
const admin = await adminContext.newPage();
const operator = await operatorContext.newPage();
current = admin;

function sanitize(value) {
  let text = String(value).replace(/https?:\/\/\S+/g, '[URL]');
  for (const secret of secrets.filter(Boolean)) text = text.split(secret).join('[REDACTED]');
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED]');
}
function watch(page) {
  // Console message contents may contain URLs or request payloads; store types only.
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type() }); });
  page.on('pageerror', error => pageErrors.push(sanitize(error.message)));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.port === '18080') network.push({ method: response.request().method(), path: url.pathname, status: response.status() });
  });
}
watch(admin); watch(operator);
const unwrap = body => body && typeof body === 'object' && 'data' in body ? body.data : body;
async function check(name, fn, mode = 'browser UI') {
  activeCheck = name;
  console.log('START', name);
  const details = await fn();
  results.push({ name, mode, status: 'PASS', ...(details ? { details } : {}) });
  console.log('PASS', name);
}
async function snapshot(page, name) {
  await page.screenshot({ path: path.join(shots, `operations-extended-${name}.png`), fullPage: true });
}
async function api(token, route, method = 'GET', body) {
  const response = await fetch(fixture.base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  apiCalls.push({ method, path: new URL(route, fixture.base).pathname, status: response.status });
  assert.ok(response.ok, `API ${method} ${new URL(route, fixture.base).pathname}: HTTP ${response.status}`);
  if (response.status === 204) return undefined;
  return unwrap(await response.json());
}
async function apiLogin(role) {
  const session = await api(undefined, '/api/v1/auth/login', 'POST', { usernameOrEmail: fixture.users[role].username, password: fixture.password });
  const token = session.accessToken || session.token;
  assert.ok(token, 'API login did not return an access token');
  secrets.push(token, session.refreshToken);
  return token;
}
async function login(page, role) {
  current = page;
  await page.goto('http://localhost:3102/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input').first().fill(fixture.users[role].username);
  await page.locator('input[type=password]').fill(fixture.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(url => !url.pathname.includes('login'));
  await page.getByRole('button', { name: /Đăng xuất/ }).waitFor();
}
async function openMission(page, id) {
  current = page;
  await page.goto(`http://localhost:3102/missions/${id}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
}
async function mutation(page, label, suffix) {
  current = page;
  const response = page.waitForResponse(item => new URL(item.url()).pathname.endsWith(suffix) && item.request().method() === 'POST');
  await page.getByRole('button', { name: label, exact: true }).click();
  const result = await response;
  assert.ok(result.ok(), `${suffix}: HTTP ${result.status()}`);
  const body = unwrap(await result.json());
  await page.getByText('Đang xử lý…', { exact: true }).waitFor({ state: 'hidden' });
  return body;
}
async function chooseResource(page, label, id) {
  const select = page.getByRole('combobox', { name: label, exact: true });
  await select.locator(`option[value="${id}"]`).waitFor({ state: 'attached' });
  await select.selectOption(String(id));
}
async function assignBase(page, missionId, resource) {
  await openMission(page, missionId);
  assert.equal((await mutation(page, 'Xác nhận', '/confirm')).status, 'CONFIRMED');
  await chooseResource(page, 'Trạm', resource.stationId);
  await mutation(page, 'Gán trạm', '/assign-station');
  await chooseResource(page, 'UAV', resource.uavId);
  await mutation(page, 'Gán uav', '/assign-uav');
}
async function reserveTwo(page) {
  await chooseResource(page, 'Thiết bị', created.equipmentId);
  await page.getByRole('spinbutton', { name: 'Số lượng giữ', exact: true }).fill('2');
  return mutation(page, 'Giữ thiết bị', '/reserve-equipment');
}
async function terminalState(page, status) {
  await page.locator(`[data-status=${status}]`).waitFor();
  for (const label of ['Nhận nhiệm vụ', 'Báo vướng mắc', 'Bắt đầu', 'Hoàn tất', 'Sẵn sàng', 'Hủy nhiệm vụ', 'Ghi nhận không thành công', 'Giữ thiết bị']) {
    assert.equal(await page.getByRole('button', { name: label, exact: true }).count(), 0, `Terminal action remains: ${label}`);
  }
  assert.equal(await page.locator('input[type=file]').count(), 0);
}

try {
  let adminToken, customerToken, resource;
  const tag = Date.now().toString(36);
  await check('API setup: create isolated resources and authenticate fixture accounts', async () => {
    adminToken = await apiLogin('admin'); customerToken = await apiLogin('customer');
    const station = await api(adminToken, '/api/v1/stations', 'POST', { code: `WF-${tag}`, name: `Trạm kiểm thử ${tag}`, address: 'Synthetic integration location' });
    const uav = await api(adminToken, '/api/v1/uavs', 'POST', { serialNumber: `WF-UAV-${tag}`, model: 'Workflow test UAV', manufacturer: 'Synthetic QA' });
    const equipment = await api(adminToken, '/api/v1/inventory/equipment', 'POST', { name: `Pin kiểm thử ${tag}`, type: 'BATTERY', serialNumber: `WF-PIN-${tag}`, stationId: station.id });
    await api(adminToken, `/api/v1/inventory/equipment/${equipment.id}/stock-in`, 'POST', { quantity: 8, note: 'Synthetic workflow fixture', requestId: randomUUID() });
    Object.assign(created, { stationId: station.id, uavId: uav.id, equipmentId: equipment.id });
    resource = { stationId: station.id, uavId: uav.id };
    return { ...created, availableQuantity: 8 };
  }, 'API setup; not UI coverage');
  async function seedMission(title, hour) {
    const date = new Date(Date.UTC(2027, 0, 1) + created.uavId * 86_400_000).toISOString().slice(0, 10);
    const start = `${date}T${String(hour).padStart(2, '0')}:00:00`;
    const end = `${date}T${String(hour + 1).padStart(2, '0')}:00:00`;
    const mission = await api(customerToken, '/api/v1/missions', 'POST', { missionType: 'AREA_INSPECTION', title: `${title} ${tag}`, requestedDate: date, startTime: start, expectedEndTime: end, locationName: 'Khu vực kiểm thử tổng hợp', priority: 'NORMAL' });
    await api(customerToken, `/api/v1/missions/${mission.id}/submit`, 'POST');
    return mission.id;
  }
  await check('admin logs in to Operations UI', () => login(admin, 'admin'));
  await check('API setup: create and submit partial-assignment mission', async () => {
    created.rejectedMissionId = await seedMission('Kiểm thử từ chối sau giữ tài nguyên', 8);
    return { missionId: created.rejectedMissionId };
  }, 'API setup; not UI coverage');
  await check('UI confirm, assign station/UAV, reserve two items without operator', async () => {
    await assignBase(admin, created.rejectedMissionId, resource);
    const result = await reserveTwo(admin);
    assert.equal(result.status, 'CONFIRMED');
    assert.ok(!result.operatorId, 'Fixture must remain without an operator');
    const stock = await api(adminToken, `/api/v1/inventory/equipment/${created.equipmentId}`);
    const uav = await api(adminToken, `/api/v1/uavs/${created.uavId}`);
    assert.equal(stock.availableQuantity, 6); assert.equal(stock.reservedQuantity, 2); assert.equal(uav.status, 'ASSIGNED');
    await snapshot(admin, 'partial-reservation');
    return { missionStatus: result.status, reservedQuantity: stock.reservedQuantity, uavStatus: uav.status };
  }, 'browser UI mutations + API read-back');
  await check('UI rejection releases partial assignment and records reason', async () => {
    const reason = 'Không đủ điều kiện triển khai tại khu vực kiểm thử.';
    await admin.getByRole('button', { name: 'Từ chối', exact: true }).click();
    await admin.getByLabel('Lý do / vướng mắc').fill(reason);
    assert.equal((await mutation(admin, 'Xác nhận từ chối', '/reject')).status, 'REJECTED');
    await terminalState(admin, 'REJECTED');
    await admin.locator('#timeline').getByText(reason, { exact: true }).waitFor();
    const stock = await api(adminToken, `/api/v1/inventory/equipment/${created.equipmentId}`);
    const uav = await api(adminToken, `/api/v1/uavs/${created.uavId}`);
    assert.equal(stock.availableQuantity, 8); assert.equal(stock.reservedQuantity, 0); assert.equal(uav.status, 'AVAILABLE');
    await snapshot(admin, 'rejected-resources-released');
    return { missionStatus: 'REJECTED', availableQuantity: stock.availableQuantity, reservedQuantity: stock.reservedQuantity, uavStatus: uav.status };
  }, 'browser UI mutation + API read-back');

  await check('API setup: create and submit execution-failure mission', async () => {
    created.failedMissionId = await seedMission('Kiểm thử sự cố khi đang vận hành', 10);
    return { missionId: created.failedMissionId };
  }, 'API setup; not UI coverage');
  await check('UI reuses released resources, assigns operator, reserves quantity two', async () => {
    await assignBase(admin, created.failedMissionId, resource);
    const select = admin.getByRole('combobox', { name: 'Người vận hành', exact: true });
    const option = select.locator('option').filter({ hasText: fixture.users.operator.username });
    await option.waitFor({ state: 'attached' });
    await select.selectOption(await option.getAttribute('value'));
    await mutation(admin, 'Gán người vận hành', '/assign-operator');
    assert.equal((await reserveTwo(admin)).status, 'RESOURCE_RESERVED');
    assert.equal(await admin.getByRole('button', { name: 'Ghi nhận không thành công', exact: true }).count(), 0, 'An unassigned admin cannot fail this mission');
  });
  await check('operator logs in and sees failure action at resource-reserved state', async () => {
    await login(operator, 'operator');
    await openMission(operator, created.failedMissionId);
    await operator.getByRole('button', { name: 'Ghi nhận không thành công', exact: true }).waitFor();
    assert.equal((await mutation(operator, 'Nhận nhiệm vụ', '/accept')).operatorAccepted, true);
  });
  await check('UI ready and start move UAV into use', async () => {
    await openMission(admin, created.failedMissionId);
    assert.equal((await mutation(admin, 'Sẵn sàng', '/ready')).status, 'READY');
    await openMission(operator, created.failedMissionId);
    assert.equal((await mutation(operator, 'Bắt đầu', '/start')).status, 'IN_PROGRESS');
    assert.equal((await api(adminToken, `/api/v1/uavs/${created.uavId}`)).status, 'IN_USE');
  }, 'browser UI mutations + API read-back');
  await check('failure reason is required and dismissing confirmation sends no mutation', async () => {
    const before = network.filter(item => item.method === 'POST' && item.path.endsWith('/fail')).length;
    await operator.getByRole('button', { name: 'Ghi nhận không thành công', exact: true }).click();
    const submit = operator.getByRole('button', { name: 'Xác nhận không thành công', exact: true });
    assert.equal(await submit.isDisabled(), true);
    await operator.getByLabel(/^Lý do không thành công/).fill('   ');
    assert.equal(await submit.isDisabled(), true);
    await operator.getByLabel(/^Lý do không thành công/).fill('Lý do nháp chưa gửi');
    assert.equal(await submit.isEnabled(), true);
    await operator.getByRole('button', { name: 'Quay lại', exact: true }).click();
    assert.equal(network.filter(item => item.method === 'POST' && item.path.endsWith('/fail')).length, before);
    assert.equal((await api(adminToken, `/api/v1/missions/${created.failedMissionId}`)).status, 'IN_PROGRESS');
  }, 'browser UI validation + API read-back');
  await check('UI failure stores reason and optional notes, shows outcome and timeline, releases stock/UAV', async () => {
    const reason = 'Gió lớn vượt điều kiện vận hành tại khu vực kiểm thử.';
    const notes = 'Đã hạ cánh an toàn.\nĐã kiểm tra và thu hồi thiết bị.';
    await operator.getByRole('button', { name: 'Ghi nhận không thành công', exact: true }).click();
    await operator.getByLabel(/^Lý do không thành công/).fill(reason);
    await operator.getByLabel('Ghi chú sự cố (tùy chọn)', { exact: true }).fill(notes);
    await snapshot(operator, 'failure-confirmation');
    const result = await mutation(operator, 'Xác nhận không thành công', '/fail');
    assert.equal(result.status, 'FAILED'); assert.equal(result.failureReason, reason); assert.equal(result.failureNotes, notes);
    await terminalState(operator, 'FAILED');
    const outcome = operator.getByRole('region', { name: 'Kết quả thực hiện', exact: true });
    await outcome.getByText(reason, { exact: true }).waitFor();
    await outcome.getByText(notes, { exact: true }).waitFor();
    await operator.locator('#timeline').getByText(reason, { exact: true }).waitFor();
    const stock = await api(adminToken, `/api/v1/inventory/equipment/${created.equipmentId}`);
    const uav = await api(adminToken, `/api/v1/uavs/${created.uavId}`);
    assert.equal(stock.availableQuantity, 8); assert.equal(stock.reservedQuantity, 0); assert.equal(uav.status, 'AVAILABLE');
    await snapshot(operator, 'failed-outcome');
    await operator.reload();
    await operator.getByRole('region', { name: 'Kết quả thực hiện', exact: true }).getByText(reason, { exact: true }).waitFor();
    await terminalState(operator, 'FAILED');
    await operator.setViewportSize({ width: 375, height: 812 });
    assert.equal(await operator.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile mission outcome overflows viewport');
    await snapshot(operator, 'failed-mobile');
    return { missionStatus: result.status, availableQuantity: stock.availableQuantity, reservedQuantity: stock.reservedQuantity, uavStatus: uav.status };
  }, 'browser UI mutation + API read-back');

  await check('UI creates equipment with an explicitly selected station', async () => {
    current = admin;
    await admin.goto('http://localhost:3102/inventory');
    await admin.getByRole('button', { name: 'Tạo thiết bị', exact: true }).click();
    await admin.getByLabel('Tên thiết bị', { exact: true }).fill(`Thiết bị tạo từ giao diện ${tag}`);
    await admin.getByLabel('Serial', { exact: true }).fill(`WF-UI-${tag}`);
    const station = admin.getByLabel('Trạm lưu thiết bị (tùy chọn)', { exact: true });
    await station.locator(`option[value="${created.stationId}"]`).waitFor({ state: 'attached' });
    await station.selectOption(String(created.stationId));
    const response = admin.waitForResponse(item => new URL(item.url()).pathname === '/api/v1/inventory/equipment' && item.request().method() === 'POST');
    await admin.getByRole('button', { name: 'Tạo thiết bị', exact: true }).click();
    const posted = await response; assert.ok(posted.ok(), `Equipment create HTTP ${posted.status()}`);
    const equipment = unwrap(await posted.json());
    created.uiEquipmentId = equipment.id;
    assert.equal(equipment.stationId, created.stationId);
    const stored = await api(adminToken, `/api/v1/inventory/equipment/${equipment.id}`);
    assert.equal(stored.stationId, created.stationId);
    await admin.getByRole('button', { name: 'Đóng form', exact: true }).waitFor({ state: 'hidden' });
    await admin.getByRole('textbox', { name: /Tìm.*Bảng kho thiết bị/ }).fill(`Thiết bị tạo từ giao diện ${tag}`);
    await admin.getByRole('table', { name: 'Bảng kho thiết bị', exact: true }).getByRole('cell', { name: `Thiết bị tạo từ giao diện ${tag}`, exact: false }).waitFor();
    await snapshot(admin, 'equipment-created-with-station');
    return { equipmentId: equipment.id, stationId: stored.stationId };
  }, 'browser UI mutation + API read-back');
  await check('browser run has no unexpected API failures or page errors', async () => {
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(network.filter(item => item.status >= 400), []);
    assert.deepEqual(consoleIssues, []);
  });
} catch (error) {
  failure = { check: activeCheck, message: sanitize(error.message) };
  results.push({ name: activeCheck || 'setup', status: 'FAIL', error: failure.message });
  console.log('FAIL', failure.check, failure.message);
  // Never screenshot a filled login form.
  if (current && !new URL(current.url()).pathname.includes('login')) await snapshot(current, 'failure').catch(() => {});
  process.exitCode = 1;
} finally {
  const evidence = { status: failure ? 'FAIL' : 'PASS', scope: 'Real Operations UI and disposable backend; API fixture setup and read-back explicitly labeled', created, results, failure, pageErrors, consoleIssues, network, apiCalls };
  await fs.writeFile(path.join(work, 'operations-extended-result.json'), JSON.stringify(evidence, null, 2));
  await browser.close();
  console.log(failure ? 'FAILED' : 'COMPLETE', results.filter(item => item.status === 'PASS').length, 'checks');
}
