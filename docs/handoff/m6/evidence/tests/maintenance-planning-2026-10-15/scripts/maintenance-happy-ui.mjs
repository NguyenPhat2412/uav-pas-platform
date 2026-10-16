/** Real browser mutations, API fixtures and authoritative read-back. No request bodies,
 * credentials, tokens, storage state or signed URLs are saved to evidence. */
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
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(25000); context.setDefaultNavigationTimeout(35000);
const page = await context.newPage();
const results = [], network = [], apiCalls = [], pageErrors = [], consoleIssues = [];
const secrets = [fixture.password];
let activeCheck, failure, token, uav, equipment, schedule, order;
const tag = Date.now().toString(36);
const unwrap = body => body && typeof body === 'object' && 'data' in body ? body.data : body;
function sanitize(value) { let result = String(value).replace(/https?:\/\/\S+/g, '[URL]'); for (const secret of secrets.filter(Boolean)) result = result.split(secret).join('[REDACTED]'); return result.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED]'); }
page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type() }); });
page.on('pageerror', error => pageErrors.push(sanitize(error.message)));
page.on('response', response => { const url = new URL(response.url()); if (url.port === '18080') network.push({ method: response.request().method(), path: url.pathname, status: response.status() }); });
async function check(name, fn, mode = 'browser UI + API read-back') { activeCheck = name; console.log('START', name); const details = await fn(); results.push({ name, status: 'PASS', mode, ...(details ? { details } : {}) }); console.log('PASS', name); }
async function api(route, method = 'GET', body) {
 const response = await fetch(fixture.base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 apiCalls.push({ method, path: new URL(route, fixture.base).pathname, status: response.status });
 assert.ok(response.ok, `API ${method} ${new URL(route, fixture.base).pathname}: HTTP ${response.status}`);
 return response.status === 204 ? undefined : unwrap(await response.json());
}
async function login() { await page.goto('http://localhost:3102/login'); await page.waitForLoadState('networkidle'); await page.locator('input').first().fill(fixture.users.admin.username); await page.locator('input[type=password]').fill(fixture.password); await page.locator('button[type=submit]').click(); await page.waitForURL(url => !url.pathname.includes('login')); await page.getByRole('button', { name: /Đăng xuất/ }).waitFor(); }
async function mutate(button, suffix, method = 'POST') { const pending = page.waitForResponse(r => new URL(r.url()).pathname.endsWith(suffix) && r.request().method() === method); await page.getByRole('button', { name: button, exact: true }).click(); const response = await pending; assert.ok(response.ok(), `${method} ${suffix}: HTTP ${response.status()}`); const value = unwrap(await response.json()); await page.getByText('Đang lưu và kiểm tra trạng thái mới nhất…').waitFor({ state: 'hidden' }); return value; }
async function screenshot(name) { await page.screenshot({ path: path.join(shots, `maintenance-planning-${name}.png`), fullPage: false }); }
async function closeDialog() { await page.getByRole('dialog').getByRole('button', { name: 'Fermer / Đóng', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' }); }
async function openOrder() { await page.getByRole('tab', { name: 'Phiếu sửa chữa', exact: true }).click(); await page.locator('article').filter({ hasText: order.title }).getByRole('button', { name: 'Mở phiếu sửa chữa' }).click(); await page.locator('[data-order-status]').waitFor(); }
async function readOrder() { order = await api(`/api/v1/maintenance/orders/${order.id}`); return order; }
async function stock() { const row = await api(`/api/v1/inventory/equipment/${equipment.id}`); return { quantity: row.quantity, availableQuantity: row.availableQuantity, reservedQuantity: row.reservedQuantity }; }
const vietnamDate = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const datePlus = (date, days) => new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
try {
 await check('isolated synthetic UAV and stock fixture', async () => {
  const auth = await api('/api/v1/auth/login', 'POST', { usernameOrEmail: fixture.users.admin.username, password: fixture.password }); token = auth.token || auth.accessToken; secrets.push(token, auth.refreshToken); assert.ok(token);
  uav = await api('/api/v1/uavs', 'POST', { serialNumber: `MP-${tag}`, model: 'UAV kiểm thử bảo trì', manufacturer: 'Synthetic QA' });
  equipment = await api('/api/v1/inventory/equipment', 'POST', { name: `Vật tư đối chứng ${tag}`, type: 'BATTERY', serialNumber: `MP-STOCK-${tag}`, stationId: fixture.stationId });
  await api(`/api/v1/inventory/equipment/${equipment.id}/stock-in`, 'POST', { quantity: 5, requestId: randomUUID(), note: 'Synthetic maintenance fixture' });
  return { uavId: uav.id, equipmentId: equipment.id };
 }, 'API fixture setup; not UI coverage');
 await check('admin login and permission-scoped maintenance navigation', async () => {
  await login(); await page.getByRole('link', { name: 'Bảo trì và sửa chữa', exact: true }).waitFor(); await page.goto(`http://localhost:3102/maintenance?uavId=${uav.id}`);
  await page.getByRole('heading', { name: 'Bảo trì và sửa chữa', exact: true }).waitFor(); await page.getByRole('button', { name: 'Tạo lịch định kỳ' }).waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'Lọc theo UAV' }).inputValue(), String(uav.id));
 }, 'browser UI');
 await check('create recurring schedule with overdue business date', async () => {
  await page.getByRole('button', { name: 'Tạo lịch định kỳ', exact: true }).click();
  await page.getByLabel('Tên lịch bảo trì', { exact: true }).fill(`Kiểm tra định kỳ ${tag}`);
  await page.getByLabel('Chu kỳ (ngày)', { exact: true }).fill('14'); await page.getByLabel('Ngày đến hạn tiếp theo', { exact: true }).fill(datePlus(vietnamDate, -1));
  schedule = await mutate('Tạo lịch bảo trì', '/schedules'); assert.equal(schedule.uavId, uav.id); assert.equal(schedule.dueStatus, 'OVERDUE'); assert.equal(schedule.intervalDays, 14);
  await page.locator('article').filter({ hasText: schedule.title }).getByText('Quá hạn', { exact: true }).waitFor();
 });
 await check('edit schedule then pause and reactivate with explicit confirmation', async () => {
  let row = page.locator('article').filter({ hasText: schedule.title }); await row.getByRole('button', { name: 'Chỉnh sửa lịch', exact: true }).click();
  await page.getByLabel('Chu kỳ (ngày)', { exact: true }).fill('30'); schedule = await mutate('Lưu thay đổi lịch', `/schedules/${schedule.id}`, 'PUT'); assert.equal(schedule.intervalDays, 30); assert.ok(schedule.version >= 1);
  row = page.locator('article').filter({ hasText: schedule.title }); await row.getByRole('button', { name: 'Tạm dừng lịch', exact: true }).click(); await page.getByRole('button', { name: 'Giữ nguyên lịch', exact: true }).click();
  assert.equal((await api(`/api/v1/maintenance/schedules?uavId=${uav.id}`)).content[0].active, true);
  await row.getByRole('button', { name: 'Tạm dừng lịch', exact: true }).click(); schedule = await mutate('Xác nhận tạm dừng lịch', `/schedules/${schedule.id}`, 'PUT'); assert.equal(schedule.dueStatus, 'PAUSED');
  await row.getByRole('button', { name: 'Kích hoạt lịch', exact: true }).click(); schedule = await mutate('Xác nhận kích hoạt lịch', `/schedules/${schedule.id}`, 'PUT'); assert.equal(schedule.active, true);
  await screenshot('desktop-schedule');
 });
 await check('linked order creation preserves UAV availability and schedule identity', async () => {
  await page.locator('article').filter({ hasText: schedule.title }).getByRole('button', { name: 'Lập phiếu theo lịch' }).click();
  assert.equal(await page.getByRole('combobox', { name: 'UAV của phiếu hoặc lịch', exact: true }).isDisabled(), true);
  await page.getByLabel('Người phụ trách sửa chữa', { exact: true }).fill('Kỹ thuật viên kiểm thử'); await page.getByLabel('Mô tả tình trạng và công việc', { exact: true }).fill('Kiểm tra pin, cánh quạt và cảm biến.');
  order = await mutate('Tạo phiếu sửa chữa', '/orders'); assert.equal(order.status, 'OPEN'); assert.equal(order.scheduleId, schedule.id); assert.equal(order.totalMaterialCost, '0');
  assert.equal((await api(`/api/v1/uavs/${uav.id}`)).status, 'AVAILABLE'); await page.getByRole('dialog', { name: `Phiếu sửa chữa #${order.id}` }).waitFor();
 });
 await check('edit open repair order via UI', async () => {
  await page.getByRole('button', { name: 'Sửa thông tin phiếu' }).click(); await page.getByLabel('Tên phiếu sửa chữa', { exact: true }).fill(`Bảo trì và thay vật tư ${tag}`); await page.getByLabel('Ngày dự kiến sửa chữa', { exact: true }).fill(vietnamDate);
  order = await mutate('Lưu thông tin phiếu', `/orders/${order.id}`, 'PUT'); assert.equal(order.title, `Bảo trì và thay vật tư ${tag}`); assert.equal(order.plannedDate, vietnamDate);
 });
 await check('material add and exact server half-up totals do not deduct stock', async () => {
  const before = await stock(); await page.getByRole('button', { name: 'Ghi vật tư và chi phí' }).click();
  for (const [i, name, unit, quantity, price] of [[1, 'Dầu bôi trơn', 'Lít', '0.125', '12345'], [2, 'Dung dịch vệ sinh', 'Lít', '1.005', '100']]) {
   await page.getByRole('button', { name: 'Thêm dòng vật tư' }).click(); await page.getByLabel(`Tên vật tư ${i}`, { exact: true }).fill(name); await page.getByLabel(`Đơn vị vật tư ${i}`, { exact: true }).fill(unit); await page.getByLabel(`Số lượng vật tư ${i}`, { exact: true }).fill(quantity); await page.getByLabel(`Đơn giá VND vật tư ${i}`, { exact: true }).fill(price);
  }
  order = await mutate('Lưu vật tư và chi phí', `/orders/${order.id}/materials`, 'PUT'); assert.equal(order.totalMaterialCost, '1644'); assert.deepEqual(order.materials.map(row => row.lineTotal), ['1543', '101']); assert.deepEqual(await stock(), before); assert.equal(await page.getByTestId('material-total').innerText(), '1.644 ₫');
 });
 await check('material edit, removal and zero-ledger save are real mutations', async () => {
  await page.getByRole('button', { name: 'Ghi vật tư và chi phí' }).click(); await page.getByLabel('Số lượng vật tư 1', { exact: true }).fill('0.001'); await page.getByLabel('Đơn giá VND vật tư 1', { exact: true }).fill('500'); await page.getByRole('button', { name: 'Xóa vật tư 2', exact: true }).click();
  order = await mutate('Lưu vật tư và chi phí', `/orders/${order.id}/materials`, 'PUT'); assert.equal(order.totalMaterialCost, '1'); assert.equal(order.materials.length, 1);
  await page.getByRole('button', { name: 'Ghi vật tư và chi phí' }).click(); await page.getByRole('button', { name: 'Xóa vật tư 1', exact: true }).click(); order = await mutate('Lưu vật tư và chi phí', `/orders/${order.id}/materials`, 'PUT'); assert.equal(order.totalMaterialCost, '0'); assert.equal(order.materials.length, 0);
  await page.getByRole('button', { name: 'Ghi vật tư và chi phí' }).click(); await page.getByRole('button', { name: 'Thêm dòng vật tư' }).click(); await page.getByLabel('Tên vật tư 1', { exact: true }).fill('Cánh quạt thay thế'); await page.getByLabel('Đơn vị vật tư 1', { exact: true }).fill('Chiếc'); await page.getByLabel('Số lượng vật tư 1', { exact: true }).fill('2'); await page.getByLabel('Đơn giá VND vật tư 1', { exact: true }).fill('125000'); order = await mutate('Lưu vật tư và chi phí', `/orders/${order.id}/materials`, 'PUT'); assert.equal(order.totalMaterialCost, '250000');
 });
 await check('start requires confirmation and transitions idle UAV into maintenance', async () => {
  await page.getByRole('button', { name: 'Bắt đầu sửa chữa', exact: true }).click(); await page.getByRole('button', { name: 'Quay lại phiếu', exact: true }).click(); assert.equal((await readOrder()).status, 'OPEN');
  await page.getByRole('button', { name: 'Bắt đầu sửa chữa', exact: true }).click(); order = await mutate('Xác nhận bắt đầu sửa chữa', `/orders/${order.id}/start`); assert.equal(order.status, 'IN_PROGRESS'); assert.equal((await api(`/api/v1/uavs/${uav.id}`)).status, 'MAINTENANCE');
  await screenshot('desktop-order-costs');
 });
 await check('mobile completion requires inspection notes and human confirmation', async () => {
  await page.setViewportSize({ width: 375, height: 812 }); await page.getByRole('button', { name: 'Hoàn tất phiếu sửa chữa', exact: true }).click(); const submit = page.getByRole('button', { name: 'Xác nhận hoàn tất phiếu', exact: true }); assert.equal(await submit.isDisabled(), true);
  await page.getByLabel('Kết quả kiểm tra sau sửa chữa', { exact: true }).fill('Đã kiểm tra cánh quạt, pin và cảm biến. Cho phép đưa UAV trở lại hoạt động.'); assert.equal(await submit.isDisabled(), true);
  await page.getByLabel('Tôi xác nhận đã kiểm tra UAV và cho phép đưa trở lại hoạt động.', { exact: true }).check(); assert.equal(await submit.isEnabled(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); await screenshot('mobile-completion-confirmation');
  order = await mutate('Xác nhận hoàn tất phiếu', `/orders/${order.id}/complete`); assert.equal(order.status, 'COMPLETED'); assert.equal(order.totalMaterialCost, '250000'); assert.equal((await api(`/api/v1/uavs/${uav.id}`)).status, 'AVAILABLE');
  schedule = (await api(`/api/v1/maintenance/schedules?uavId=${uav.id}`)).content.find(row => row.id === schedule.id); assert.equal(schedule.lastCompletedDate, vietnamDate); assert.equal(schedule.nextDueDate, datePlus(vietnamDate, 30));
 });
 await check('closed order is immutable and mobile detail remains within viewport', async () => {
  for (const name of ['Sửa thông tin phiếu', 'Ghi vật tư và chi phí', 'Bắt đầu sửa chữa', 'Hoàn tất phiếu sửa chữa', 'Hủy phiếu sửa chữa']) assert.equal(await page.getByRole('button', { name, exact: true }).count(), 0);
  await page.getByText('Phiếu đã đóng. Thông tin và chi phí được giữ để tra cứu, không thể chỉnh sửa.').waitFor(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); await screenshot('mobile-completed-order'); await closeDialog();
 });
 await check('ad hoc order cancellation leaves available UAV and no schedule advancement', async () => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.getByRole('button', { name: 'Lập phiếu sửa chữa', exact: true }).click(); await page.getByLabel('Tên phiếu sửa chữa', { exact: true }).fill(`Phiếu đột xuất ${tag}`); await page.getByLabel('Người phụ trách sửa chữa', { exact: true }).fill('Kỹ thuật viên dự phòng');
  order = await mutate('Tạo phiếu sửa chữa', '/orders'); assert.equal(order.scheduleId, null); await page.getByRole('button', { name: 'Hủy phiếu sửa chữa', exact: true }).click(); assert.equal(await page.getByRole('button', { name: 'Xác nhận hủy phiếu', exact: true }).isDisabled(), true);
  await page.getByLabel('Lý do hủy phiếu sửa chữa', { exact: true }).fill('Không phát hiện hư hỏng, hủy kế hoạch bổ sung.'); order = await mutate('Xác nhận hủy phiếu', `/orders/${order.id}/cancel`); assert.equal(order.status, 'CANCELLED'); assert.equal((await api(`/api/v1/uavs/${uav.id}`)).status, 'AVAILABLE');
  const unchanged = (await api(`/api/v1/maintenance/schedules?uavId=${uav.id}`)).content.find(row => row.id === schedule.id); assert.equal(unchanged.nextDueDate, schedule.nextDueDate); await closeDialog();
 });
 await check('fleet drawer links back to filtered maintenance page and translated history', async () => {
  await page.goto('http://localhost:3102/uavs'); await page.getByRole('textbox', { name: /Tìm.*Bảng đội UAV/ }).fill(uav.serialNumber); await page.getByRole('row').filter({ hasText: uav.serialNumber }).getByRole('button', { name: 'Mở chi tiết', exact: true }).click(); await page.getByRole('tab', { name: 'Hoạt động', exact: true }).click(); await page.getByText(/Bắt đầu phiếu sửa chữa/).waitFor(); await page.getByText(/Hoàn tất phiếu sửa chữa/).waitFor();
  await page.getByRole('tab', { name: 'Bảo trì', exact: true }).click(); await page.getByRole('link', { name: 'Mở lịch bảo trì và phiếu sửa chữa', exact: true }).click(); await page.waitForURL(url => url.pathname === '/maintenance'); assert.equal(await page.getByRole('combobox', { name: 'Lọc theo UAV' }).inputValue(), String(uav.id));
 });
 await check('no browser runtime errors or unexpected failed UI requests', async () => { assert.equal(pageErrors.length, 0); assert.deepEqual(network.filter(row => row.status >= 400), []); assert.equal(consoleIssues.length, 0); }, 'browser diagnostics');
} catch (error) { failure = sanitize(error?.stack || error); results.push({ name: activeCheck || 'initialization', status: 'FAIL', detail: failure }); console.error(failure); await screenshot('failure').catch(() => {}); }
finally { await browser.close(); await fs.writeFile(path.join(work, 'maintenance-happy-ui-result.json'), JSON.stringify({ status: failure ? 'FAIL' : 'PASS', date: new Date().toISOString(), coverage: 'Real browser UI using synthetic disposable fixtures; API setup/readback labeled separately', results, network, apiCalls, pageErrors, consoleIssues, screenshotDirectory: shots }, null, 2)); }
if (failure) process.exitCode = 1;
