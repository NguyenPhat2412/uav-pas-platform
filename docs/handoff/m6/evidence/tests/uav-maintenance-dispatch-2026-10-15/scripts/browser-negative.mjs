/** Real browser mutations and stale forms. API/SQL fixture and read-back are explicitly separated. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const work = process.env.UAV_BROWSER_WORK;
const f = JSON.parse(await fs.readFile(path.join(work, 'fixture.json'), 'utf8'));
assert.equal(f.base, 'http://127.0.0.1:18080');
const shots = process.env.UAV_BROWSER_SCREENSHOTS;
await fs.mkdir(shots, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const contexts = {}, pages = {}, tokens = {}, results = [], apiCalls = [], network = [], pageErrors = [], consoleIssues = [], created = [];
const secrets = [f.password];
const tag = Date.now().toString(36);
let seq = 0, current, station, operatorId;
const unwrap = value => value && typeof value === 'object' && 'data' in value ? value.data : value;
const sanitize = value => { let s = String(value).replace(/https?:\/\/\S+/g, '[URL]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED]'); for (const v of secrets.filter(Boolean)) s = s.split(v).join('[REDACTED]'); return s; };
async function api(role, route, method = 'GET', body, expected) {
  const r = await fetch(f.base + route, { method, headers: { 'Content-Type': 'application/json', ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  apiCalls.push({ method, path: new URL(route, f.base).pathname, status: r.status });
  if (expected === undefined) assert.ok(r.ok, `${method} ${new URL(route, f.base).pathname}: ${r.status}`); else assert.equal(r.status, expected, `${method} ${new URL(route, f.base).pathname}`);
  return unwrap(await r.json().catch(() => null));
}
function sql(query) {
  assert.ok(/^(SELECT|UPDATE) /.test(query));
  return execFileSync('docker', ['exec', 'uav-ui-dispatch-20261015-postgres-1', 'psql', '-U', 'uav_test', '-d', 'uav_stabilization', '-Atc', query], { encoding: 'utf8' }).trim();
}
function numeric(id) { assert.ok(Number.isSafeInteger(id) && id > 0); return id; }
async function check(name, fn, mode = 'browser UI + API fixture/concurrent update/read-back') {
  console.log('START', name);
  try { const detail = await fn(); results.push({ name, status: 'PASS', mode, ...(detail ? { detail } : {}) }); console.log('PASS', name); }
  catch (e) { results.push({ name, status: 'FAIL', mode, message: sanitize(e.message) }); console.log('FAIL', name, sanitize(e.message)); process.exitCode = 1; if (current && !new URL(current.url()).pathname.includes('login')) await current.screenshot({ path: path.join(shots, `negative-failed-${results.length}.png`), fullPage: false }).catch(() => {}); }
}
async function login(role) {
  const auth = await api(role, '/api/v1/auth/login', 'POST', { usernameOrEmail: f.users[role].username, password: f.password }); tokens[role] = auth.token || auth.accessToken; assert.ok(tokens[role]); secrets.push(tokens[role], auth.refreshToken);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts[role] = context; context.setDefaultTimeout(18000); context.setDefaultNavigationTimeout(35000);
  const page = await context.newPage(); pages[role] = page; current = page;
  page.on('pageerror', e => pageErrors.push(sanitize(e.message)));
  page.on('console', m => { if (['warning', 'error'].includes(m.type())) consoleIssues.push({ type: m.type() }); });
  page.on('response', r => { const u = new URL(r.url()); if (u.port === '18080') network.push({ role, method: r.request().method(), path: u.pathname, status: r.status() }); });
  await page.goto('http://localhost:3102/login'); await page.waitForLoadState('networkidle'); await page.locator('input').first().fill(f.users[role].username); await page.locator('input[type=password]').fill(f.password); await page.locator('button[type=submit]').click(); await page.waitForURL(u => !u.pathname.includes('login')); await page.getByRole('button', { name: /Đăng xuất/ }).waitFor();
}
async function uav() { const value = await api('admin', '/api/v1/uavs', 'POST', { serialNumber: `BNEG-${tag}-${++seq}`, model: 'UAV kiểm tra nhánh ngoại lệ', manufacturer: 'Synthetic QA' }); created.push({ kind: 'uav', id: value.id }); return value; }
async function mission(aircraft, state = 'CONFIRMED', reserve = true) {
  const date = new Date(Date.UTC(2032, 0, 1) + aircraft.id * 86400000 + seq++ * 86400000).toISOString().slice(0, 10);
  const m = await api('customer', '/api/v1/missions', 'POST', { missionType: 'AREA_INSPECTION', title: `Nhánh ngoại lệ ${tag} ${seq}`, requestedDate: date, startTime: `${date}T09:00:00`, expectedEndTime: `${date}T10:00:00`, locationName: 'Khu vực kiểm thử tổng hợp', priority: 'NORMAL' }); created.push({ kind: 'mission', id: m.id });
  for (const action of ['submit', 'confirm']) await api(action === 'submit' ? 'customer' : 'admin', `/api/v1/missions/${m.id}/${action}`, 'POST');
  for (const [action, id] of [['assign-station', station.id], ['assign-uav', aircraft.id]]) await api('admin', `/api/v1/missions/${m.id}/${action}`, 'POST', { resourceId: id, quantity: 1 });
  let stock;
  if (reserve) { stock = await api('admin', '/api/v1/inventory/equipment', 'POST', { name: `Pin nhánh ${tag} ${seq}`, type: 'BATTERY', stationId: station.id }); await api('admin', `/api/v1/inventory/equipment/${stock.id}/stock-in`, 'POST', { quantity: 3, note: 'Synthetic fixture' }); await api('admin', `/api/v1/missions/${m.id}/reserve-equipment`, 'POST', { resourceId: stock.id, quantity: 2, note: 'Fixture' }); }
  if (state !== 'CONFIRMED') await api('admin', `/api/v1/missions/${m.id}/assign-operator`, 'POST', { resourceId: operatorId, quantity: 1 });
  if (['READY', 'IN_PROGRESS'].includes(state)) await api('admin', `/api/v1/missions/${m.id}/ready`, 'POST');
  if (state === 'IN_PROGRESS') await api('operator', `/api/v1/missions/${m.id}/start`, 'POST');
  return { ...m, aircraft, stock };
}
async function missionPage(role, m) { const p = pages[role]; current = p; await p.goto(`http://localhost:3102/missions/${m.id}`); await p.getByRole('heading', { name: m.title, exact: true }).waitFor(); return p; }
async function clickMutation(page, label, suffix, expected = 200, method = 'POST') {
  current = page; const waiting = page.waitForResponse(r => new URL(r.url()).pathname.endsWith(suffix) && r.request().method() === method); await page.getByRole('button', { name: label, exact: true }).click(); const r = await waiting; assert.equal(r.status(), expected, `${method} ${suffix}`); const body = unwrap(await r.json().catch(() => null)); await page.getByText('Đang xử lý…', { exact: true }).waitFor({ state: 'hidden' }); await page.getByText('Đang cập nhật UAV…', { exact: true }).waitFor({ state: 'hidden' }); return body;
}
async function openReplace(m, candidate) { const p = await missionPage('admin', m); await p.getByRole('button', { name: 'Thay UAV', exact: true }).click(); const s = p.getByRole('combobox', { name: 'UAV thay thế', exact: true }); await s.locator(`option[value="${candidate.id}"]`).waitFor({ state: 'attached' }); await s.selectOption(String(candidate.id)); await p.getByLabel('Lý do điều phối lại', { exact: false }).fill('Kiểm tra màn hình mở trước thay đổi đồng thời'); return p; }
async function openUav(aircraft) { const p = pages.admin; current = p; await p.goto('http://localhost:3102/uavs'); await p.getByRole('textbox', { name: /Tìm.*Bảng đội UAV/ }).fill(aircraft.serialNumber); await p.getByRole('row').filter({ hasText: aircraft.serialNumber }).getByRole('button', { name: 'Mở chi tiết', exact: true }).click(); await p.getByRole('dialog', { name: 'Chi tiết UAV' }).waitFor(); await p.getByRole('tab', { name: 'Bảo trì', exact: true }).click(); return p; }
async function assertTerminal(m, status, page) {
  assert.equal((await api('admin', `/api/v1/missions/${m.id}`)).status, status); assert.equal((await api('admin', `/api/v1/uavs/${m.aircraft.id}`)).status, 'AVAILABLE');
  const stock = await api('admin', `/api/v1/inventory/equipment/${m.stock.id}`); assert.equal(stock.reservedQuantity, 0); assert.equal(stock.availableQuantity, 3);
  for (const name of ['Thay UAV', 'Gỡ UAV khỏi nhiệm vụ', 'Nhận nhiệm vụ', 'Báo vướng mắc', 'Bắt đầu', 'Hoàn tất', 'Hủy nhiệm vụ', 'Ghi nhận không thành công']) assert.equal(await page.getByRole('button', { name, exact: true }).count(), 0, `Terminal action remains: ${name}`);
  assert.equal(sql(`SELECT count(*) FROM uav_status_history WHERE uav_id=${numeric(m.aircraft.id)} AND from_status IN ('ASSIGNED','IN_USE') AND to_status='AVAILABLE'`), '1');
  assert.equal(sql(`SELECT count(*) FROM inventory_movements WHERE equipment_id=${numeric(m.stock.id)} AND type='RELEASE'`), '1');
}
try {
  for (const role of ['admin', 'operator', 'operator_b']) await login(role);
  const auth = await api('customer', '/api/v1/auth/login', 'POST', { usernameOrEmail: f.users.customer.username, password: f.password }); tokens.customer = auth.token || auth.accessToken; secrets.push(tokens.customer, auth.refreshToken);
  operatorId = (await api('operator', '/api/v1/auth/me')).id;
  station = await api('admin', '/api/v1/stations', 'POST', { code: `BN-${tag}`, name: `Trạm nhánh giao diện ${tag}`, address: 'Synthetic QA' });
  await check('stale replace form receives 409 and displays the newest UAV without overwriting it', async () => {
    const a = await uav(), b = await uav(), c = await uav(), m = await mission(a, 'CONFIRMED', false), p = await openReplace(m, b);
    await api('admin', `/api/v1/missions/${m.id}/replace-uav`, 'POST', { expectedCurrentUavId: a.id, replacementUavId: c.id, reason: 'Other admin changed assignment' });
    await clickMutation(p, 'Xác nhận thay UAV', '/replace-uav', 409);
    const alert = p.getByRole('alert').first(); await alert.waitFor();
    await p.waitForFunction(() => { const el = document.querySelector('[role=alert]'); if (!el) return false; const box = el.getBoundingClientRect(); return document.activeElement === el && box.top >= 0 && box.bottom <= innerHeight; }, undefined, { timeout: 3000 });
    assert.equal(await alert.evaluate(el => document.activeElement === el), true, 'Mutation error must receive keyboard focus');
    await p.locator('#resources').getByText(new RegExp(c.serialNumber)).waitFor(); assert.equal((await api('admin', `/api/v1/missions/${m.id}`)).uavId, c.id); assert.equal((await api('admin', `/api/v1/uavs/${b.id}`)).status, 'AVAILABLE'); await p.screenshot({ path: path.join(shots, 'negative-stale-replace.png'), fullPage: false }); await api('admin', `/api/v1/missions/${m.id}/cancel`, 'POST');
  });
  await check('candidate claimed after form opens returns 409 and preserves the original UAV', async () => {
    const a = await uav(), b = await uav(), m = await mission(a, 'CONFIRMED', false), p = await openReplace(m, b); const other = await mission(b, 'CONFIRMED', false);
    await clickMutation(p, 'Xác nhận thay UAV', '/replace-uav', 409); await p.locator('#resources').getByText(new RegExp(a.serialNumber)).waitFor(); assert.equal((await api('admin', `/api/v1/missions/${m.id}`)).uavId, a.id); assert.equal((await api('admin', `/api/v1/missions/${other.id}`)).uavId, b.id); await api('admin', `/api/v1/missions/${m.id}/cancel`, 'POST'); await api('admin', `/api/v1/missions/${other.id}/cancel`, 'POST');
  });
  await check('stale maintenance confirmation returns 409 and refreshes current maintenance status', async () => {
    const a = await uav(), p = await openUav(a); await p.getByRole('button', { name: 'Đưa vào bảo trì', exact: true }).click(); await p.getByLabel('Lý do bảo trì', { exact: true }).fill('Biểu mẫu bảo trì cũ'); await api('admin', `/api/v1/uavs/${a.id}/maintenance?reason=Concurrent&expectedStatus=AVAILABLE`, 'POST'); await clickMutation(p, 'Xác nhận bảo trì', '/maintenance', 409); await p.getByRole('dialog').getByRole('button', { name: 'Hoàn tất bảo trì', exact: true }).waitFor(); assert.equal((await api('admin', `/api/v1/uavs/${a.id}`)).status, 'MAINTENANCE'); assert.equal(sql(`SELECT count(*) FROM uav_status_history WHERE uav_id=${numeric(a.id)} AND to_status='MAINTENANCE'`), '1'); await p.screenshot({ path: path.join(shots, 'negative-stale-maintenance.png'), fullPage: false });
  });
  await check('orphan ASSIGNED legacy UAV recovers through UI; an active owner blocks the same recovery', async () => {
    const orphan = await uav(); assert.equal(sql(`SELECT count(*) FROM missions WHERE uav_id=${numeric(orphan.id)}`), '0'); sql(`UPDATE uavs SET status='ASSIGNED' WHERE id=${numeric(orphan.id)}`);
    let p = await openUav(orphan); await p.getByRole('button', { name: 'Khôi phục UAV không có nhiệm vụ', exact: true }).click(); await p.getByLabel('Lý do khôi phục UAV', { exact: true }).fill('Xác minh dữ liệu cũ không có nhiệm vụ giữ'); await clickMutation(p, 'Xác nhận khôi phục UAV', '/status', 200, 'PUT'); assert.equal((await api('admin', `/api/v1/uavs/${orphan.id}`)).status, 'AVAILABLE');
    const active = await uav(), m = await mission(active, 'CONFIRMED', false); p = await openUav(active); await p.getByRole('button', { name: 'Khôi phục UAV không có nhiệm vụ', exact: true }).click(); await p.getByLabel('Lý do khôi phục UAV', { exact: true }).fill('Không được giải phóng nhiệm vụ đang giữ'); await clickMutation(p, 'Xác nhận khôi phục UAV', '/status', 409, 'PUT'); assert.equal((await api('admin', `/api/v1/uavs/${active.id}`)).status, 'ASSIGNED'); assert.equal((await api('admin', `/api/v1/missions/${m.id}`)).uavId, active.id); await p.getByRole('dialog').getByText(/Hãy đổi hoặc gỡ UAV trong nhiệm vụ/).waitFor(); await p.screenshot({ path: path.join(shots, 'negative-active-owner-recovery.png'), fullPage: false }); await api('admin', `/api/v1/missions/${m.id}/cancel`, 'POST');
  }, 'browser UI + API fixtures/read-back; one orphan fixture SQL UPDATE after zero-owner assertion in owned disposable database');
  for (const state of ['RESOURCE_RESERVED', 'READY', 'IN_PROGRESS']) await check(`operator fail from ${state} releases once and terminal controls disappear`, async () => {
    const m = await mission(await uav(), state), p = await missionPage('operator', m); await p.getByRole('button', { name: 'Ghi nhận không thành công', exact: true }).click(); assert.equal(await p.getByRole('button', { name: 'Xác nhận không thành công', exact: true }).isDisabled(), true); await p.getByLabel('Lý do không thành công', { exact: false }).fill('Không đủ điều kiện thực hiện trong kiểm thử'); await p.getByLabel('Ghi chú sự cố (tùy chọn)', { exact: true }).fill('Tài nguyên phải được hoàn trả một lần.'); assert.equal((await clickMutation(p, 'Xác nhận không thành công', '/fail')).status, 'FAILED'); await assertTerminal(m, 'FAILED', p); await api('operator', `/api/v1/missions/${m.id}/fail`, 'POST', { failureReason: 'Duplicate attempt' }, 409); await assertTerminal(m, 'FAILED', p);
    await api('operator', `/api/v1/missions/${m.id}/accept`, 'POST', undefined, 409); await api('operator', `/api/v1/missions/${m.id}/report-conflict?note=Late%20terminal%20conflict`, 'POST', undefined, 409); await assertTerminal(m, 'FAILED', p); if (state === 'READY') await p.screenshot({ path: path.join(shots, 'negative-failed-ready.png'), fullPage: false });
    return { browser: 'Fail button, confirmation, terminal rendering', apiOnly: 'Repeated failure, terminal accept/report-conflict return 409' };
  });
  for (const state of ['CONFIRMED', 'RESOURCE_RESERVED', 'READY']) await check(`admin cancel from ${state} releases partial/full resources exactly once and hides terminal actions`, async () => {
    const m = await mission(await uav(), state), p = await missionPage('admin', m); await p.getByRole('button', { name: 'Hủy nhiệm vụ', exact: true }).click(); assert.equal((await clickMutation(p, 'Xác nhận hủy', '/cancel')).status, 'CANCELLED'); await assertTerminal(m, 'CANCELLED', p); await api('admin', `/api/v1/missions/${m.id}/cancel`, 'POST', undefined, 409); await assertTerminal(m, 'CANCELLED', p);
  });
  await check('different operator receives 403 on protected mission page and execution request', async () => {
    const m = await mission(await uav(), 'READY'), p = pages.operator_b; current = p; const response = p.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/missions/${m.id}` && r.request().method() === 'GET'); await p.goto(`http://localhost:3102/missions/${m.id}`); assert.equal((await response).status(), 403); await p.getByRole('alert').getByText('Không thể tải nhiệm vụ hoặc bạn chưa được cấp quyền truy cập.').waitFor(); assert.equal(await p.getByRole('button', { name: 'Bắt đầu', exact: true }).count(), 0); await api('operator_b', `/api/v1/missions/${m.id}/start`, 'POST', undefined, 403); assert.equal((await api('admin', `/api/v1/missions/${m.id}`)).status, 'READY'); await p.screenshot({ path: path.join(shots, 'negative-wrong-operator.png'), fullPage: false }); await api('admin', `/api/v1/missions/${m.id}/cancel`, 'POST');
  }, 'browser protected-route 403 + API-only wrong-operator start assertion');
  await check('negative checks produce no unhandled page errors or HTTP 5xx', async () => { assert.deepEqual(pageErrors, []); assert.deepEqual(network.filter(r => r.status >= 500), []); return { expectedNegativeBrowserResponses: network.filter(r => [403, 409].includes(r.status)).length, consoleIssueCount: consoleIssues.length, consoleExplanation: 'Expected failed HTTP requests may be reported by Chromium; page errors and HTTP 5xx checked separately.' }; }, 'browser health');
} catch (error) { results.push({ name: 'setup or runner', status: 'FAIL', mode: 'test infrastructure', message: sanitize(error.message) }); console.log('FAIL setup', sanitize(error.message)); process.exitCode = 1; }
finally { await fs.writeFile(path.join(work, 'browser-negative-result.json'), JSON.stringify({ status: results.some(r => r.status === 'FAIL') ? 'FAIL' : 'PASS', browserFallback: 'Browser plugin not available; existing Playwright and Chromium', scope: 'UI failure/cancellation/redispatch/maintenance and protected route. API fixtures and concurrency injections do not count as UI transitions.', results, created, network, apiCalls, pageErrors, consoleIssues }, null, 2)); await browser.close(); }
