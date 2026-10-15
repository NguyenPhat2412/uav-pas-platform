/** Real browser negative branches; API calls are labelled fixture setup, concurrent-user simulation or read-back.
 * No tokens, credentials, request bodies, query strings or browser state are written to evidence.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const work = process.env.UAV_BROWSER_WORK;
const fixture = JSON.parse(await fs.readFile(path.join(work, 'fixture.json'), 'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080');
const shots = process.env.UAV_BROWSER_SCREENSHOTS;
await fs.mkdir(shots, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const contexts = [], pages = [], results = [], requests = [], browserRequests = [], pageErrors = [], secrets = [fixture.password];
const tokens = {}, created = {}, tag = Date.now().toString(36), base = '/api/v1/maintenance';
let current, activeCheck, failure, seq = 0;
const unwrap = body => body && typeof body === 'object' && 'data' in body ? body.data : body;
function safe(value) { let result = String(value).replace(/https?:\/\/\S+/g, '[URL]'); for (const secret of secrets.filter(Boolean)) result = result.split(secret).join('[REDACTED]'); return result.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED]'); }
async function api(route, method = 'GET', body, expected = 200, role = 'admin') {
  const r = await fetch(fixture.base + route, { method, headers: { 'Content-Type': 'application/json', ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  requests.push({ method, path: new URL(route, fixture.base).pathname, status: r.status });
  assert.equal(r.status, expected, `API ${method} ${new URL(route, fixture.base).pathname}`);
  return unwrap(await r.json().catch(() => null));
}
async function newPage(context) {
  const page = await context.newPage(); pages.push(page);
  page.on('pageerror', error => pageErrors.push(safe(error.message)));
  page.on('response', response => { const url = new URL(response.url()); if (url.port === '18080') browserRequests.push({ method: response.request().method(), path: url.pathname, status: response.status() }); });
  return page;
}
async function newContext() { const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context); context.setDefaultTimeout(25000); context.setDefaultNavigationTimeout(35000); return context; }
async function login(page, role) {
  current = page; await page.goto('http://localhost:3102/login'); await page.waitForLoadState('networkidle');
  await page.locator('input').first().fill(fixture.users[role].username); await page.locator('input[type=password]').fill(fixture.password); await page.locator('button[type=submit]').click();
  await page.waitForURL(url => !url.pathname.includes('login')); await page.waitForLoadState('networkidle');
}
async function check(name, fn, mode = 'browser UI + API authoritative read-back') { activeCheck = name; console.log('START', name); const detail = await fn(); results.push({ name, status: 'PASS', mode, ...(detail ? { detail } : {}) }); console.log('PASS', name); }
async function shot(page, name) { await page.screenshot({ path: path.join(shots, `maintenance-negative-${name}.png`), fullPage: false }); }
async function settle(page) { await page.getByText('Đang lưu và kiểm tra trạng thái mới nhất…', { exact: true }).waitFor({ state: 'hidden' }); }
async function mutate(page, button, route, method = 'POST', expected = 200) {
  current = page;
  const waiting = page.waitForResponse(r => new URL(r.url()).pathname === route && r.request().method() === method);
  await page.getByRole('button', { name: button, exact: true }).click(); const response = await waiting;
  assert.equal(response.status(), expected, `Browser ${method} ${route}`); const data = unwrap(await response.json()); await settle(page); return data;
}
async function workspace(page, uavId) { current = page; await page.goto(`http://localhost:3102/maintenance?uavId=${uavId}`); await page.getByRole('tab', { name: 'Lịch định kỳ', exact: true }).waitFor(); await page.getByRole('region', { name: 'Danh sách lịch bảo trì', exact: true }).waitFor(); }
async function openOrder(page, order) {
  await workspace(page, order.uavId); await page.getByRole('tab', { name: 'Phiếu sửa chữa', exact: true }).click();
  await page.getByRole('region', { name: 'Danh sách phiếu sửa chữa', exact: true }).getByRole('article').filter({ has: page.getByRole('heading', { name: order.title, exact: true }) }).getByRole('button', { name: 'Mở phiếu sửa chữa', exact: true }).click();
  await page.getByRole('dialog', { name: `Phiếu sửa chữa #${order.id}`, exact: true }).waitFor(); await page.getByRole('button', { name: 'Ghi vật tư và chi phí', exact: true }).waitFor();
}
function scheduleArticle(page, schedule) { return page.getByRole('region', { name: 'Danh sách lịch bảo trì', exact: true }).getByRole('article').filter({ has: page.getByRole('heading', { name: schedule.title, exact: true }) }); }
async function materialForm(page, name, quantity, price) {
  await page.getByRole('button', { name: 'Ghi vật tư và chi phí', exact: true }).click();
  if (!await page.getByLabel('Tên vật tư 1', { exact: true }).count()) await page.getByRole('button', { name: 'Thêm dòng vật tư', exact: true }).click();
  await page.getByLabel('Tên vật tư 1', { exact: true }).fill(name); await page.getByLabel('Đơn vị vật tư 1', { exact: true }).fill('bộ');
  await page.getByLabel('Số lượng vật tư 1', { exact: true }).fill(quantity); await page.getByLabel('Đơn giá VND vật tư 1', { exact: true }).fill(price);
}
async function uav(label) { return api('/api/v1/uavs', 'POST', { serialNumber: `MN-${tag}-${++seq}`, model: label, manufacturer: 'Synthetic QA' }, 201); }
async function schedule(u, title, nextDueDate = '2020-01-01') { return api(base + '/schedules', 'POST', { uavId: u.id, title: `${title} ${tag}`, intervalDays: 30, nextDueDate }, 201); }
async function order(u, schedule) { return api(base + '/orders', 'POST', { uavId: u.id, ...(schedule ? { scheduleId: schedule.id } : {}), title: `Phiếu kiểm thử UI ${tag}-${++seq}`, description: 'Tình huống tổng hợp', plannedDate: '2026-10-15', technicianName: 'Kỹ thuật viên kiểm thử' }, 201); }
async function readOrder(o) { return api(`${base}/orders/${o.id}`); }
async function readSchedule(s) { return (await api(`${base}/schedules?uavId=${s.uavId}&size=100`)).content.find(value => value.id === s.id); }

try {
  const adminContext = await newContext(), admin = await newPage(adminContext), second = await newPage(adminContext);
  const fixtures = {};
  await check('isolated synthetic fixtures for stale forms, busy UAV, linked schedule and pagination', async () => {
    for (const role of ['admin', 'customer', 'operator']) { const value = await api('/api/v1/auth/login', 'POST', { usernameOrEmail: fixture.users[role].username, password: fixture.password }, 200, role); tokens[role] = value.token || value.accessToken; secrets.push(tokens[role], value.refreshToken); }
    fixtures.staleUav = await uav('UAV hai trang'); fixtures.staleOrder = await order(fixtures.staleUav);
    fixtures.busyUav = await uav('UAV chờ kết thúc nhiệm vụ'); fixtures.busySchedule = await schedule(fixtures.busyUav, 'Lịch đang có phiếu'); fixtures.busyOrder = await order(fixtures.busyUav, fixtures.busySchedule);
    fixtures.mission = await api('/api/v1/missions', 'POST', { missionType: 'AREA_INSPECTION', title: `Nhiệm vụ chặn sửa chữa ${tag}`, requestedDate: '2039-01-01', startTime: '2039-01-01T09:00:00', expectedEndTime: '2039-01-01T10:00:00', locationName: 'Synthetic QA', priority: 'NORMAL' }, 201, 'customer');
    await api(`/api/v1/missions/${fixtures.mission.id}/submit`, 'POST', undefined, 200, 'customer'); await api(`/api/v1/missions/${fixtures.mission.id}/confirm`, 'POST');
    await api(`/api/v1/missions/${fixtures.mission.id}/assign-station`, 'POST', { resourceId: fixture.stationId, quantity: 1 }); await api(`/api/v1/missions/${fixtures.mission.id}/assign-uav`, 'POST', { resourceId: fixtures.busyUav.id, quantity: 1 });
    fixtures.scheduleUav = await uav('UAV lịch cũ'); fixtures.staleSchedule = await schedule(fixtures.scheduleUav, 'Lịch trước thay đổi');
    fixtures.listUav = await uav('UAV phân trang'); fixtures.listSchedules = [];
    for (let index = 0; index < 21; index++) fixtures.listSchedules.push(await schedule(fixtures.listUav, `Lịch quá hạn ${index + 1}`));
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    fixtures.due = await schedule(fixtures.listUav, 'Lịch hôm nay', today); fixtures.future = await schedule(fixtures.listUav, 'Lịch tương lai', '2099-01-01'); let paused = await schedule(fixtures.listUav, 'Lịch tạm dừng');
    fixtures.paused = await api(`${base}/schedules/${paused.id}`, 'PUT', { expectedVersion: paused.version, title: paused.title, intervalDays: paused.intervalDays, nextDueDate: paused.nextDueDate, active: false });
    Object.assign(created, { staleOrderId: fixtures.staleOrder.id, busyOrderId: fixtures.busyOrder.id, busyMissionId: fixtures.mission.id, paginationUavId: fixtures.listUav.id, paginationScheduleCount: 24 });
    return created;
  }, 'API setup only, not browser coverage');
  await login(admin, 'admin');
  await check('two browser tabs prevent stale material overwrite and show latest saved costs', async () => {
    const o = fixtures.staleOrder; await openOrder(admin, o); await openOrder(second, o);
    await materialForm(admin, 'Pin đã lưu ở trang một', '2', '50000'); await materialForm(second, 'Giá trị cũ trang hai', '9', '999');
    let latest = await mutate(admin, 'Lưu vật tư và chi phí', `${base}/orders/${o.id}/materials`, 'PUT'); assert.equal(latest.totalMaterialCost, '100000');
    await mutate(second, 'Lưu vật tư và chi phí', `${base}/orders/${o.id}/materials`, 'PUT', 409);
    await second.getByText(/Thông tin đã được người khác thay đổi/).waitFor(); await second.getByTestId('material-total').filter({ hasText: '100.000 ₫' }).waitFor();
    assert.equal((await readOrder(o)).materials[0].name, 'Pin đã lưu ở trang một'); await shot(second, 'stale-materials');
    await materialForm(second, 'Pin đã đối chiếu', '3', '50000'); latest = await mutate(second, 'Lưu vật tư và chi phí', `${base}/orders/${o.id}/materials`, 'PUT'); assert.equal(latest.totalMaterialCost, '150000');
  });
  await check('linked active order blocks schedule editing without changing due date', async () => {
    const s = fixtures.busySchedule; await workspace(admin, s.uavId); await scheduleArticle(admin, s).getByRole('button', { name: 'Chỉnh sửa lịch', exact: true }).click();
    await admin.getByLabel('Chu kỳ (ngày)', { exact: true }).fill('90'); await mutate(admin, 'Lưu thay đổi lịch', `${base}/schedules/${s.id}`, 'PUT', 409);
    await admin.getByText(/Lịch đang có phiếu chưa đóng/).waitFor(); const unchanged = await readSchedule(s); assert.equal(unchanged.intervalDays, 30); assert.equal(unchanged.nextDueDate, s.nextDueDate); await shot(admin, 'linked-schedule-block');
  });
  await check('busy UAV allows planned order but browser start is rejected without mutation', async () => {
    const o = fixtures.busyOrder; await openOrder(admin, o); await admin.getByRole('button', { name: 'Bắt đầu sửa chữa', exact: true }).click();
    await mutate(admin, 'Xác nhận bắt đầu sửa chữa', `${base}/orders/${o.id}/start`, 'POST', 409); await admin.getByText(/UAV đang được giữ cho nhiệm vụ/).waitFor();
    assert.equal((await readOrder(o)).status, 'OPEN'); assert.equal((await api(`/api/v1/uavs/${o.uavId}`)).status, 'ASSIGNED'); await shot(admin, 'busy-start-block');
  });
  await check('cancel started repair retains material costs, maintenance state and original due date', async () => {
    const o = fixtures.busyOrder, s = fixtures.busySchedule;
    await api(`/api/v1/missions/${fixtures.mission.id}/cancel`, 'POST'); // fixture actor releases the competing mission
    await admin.getByRole('button', { name: 'Bắt đầu sửa chữa', exact: true }).click(); assert.equal((await mutate(admin, 'Xác nhận bắt đầu sửa chữa', `${base}/orders/${o.id}/start`)).status, 'IN_PROGRESS');
    await materialForm(admin, 'Linh kiện chờ kiểm tra', '2', '150000'); await mutate(admin, 'Lưu vật tư và chi phí', `${base}/orders/${o.id}/materials`, 'PUT');
    await admin.getByRole('button', { name: 'Hủy phiếu sửa chữa', exact: true }).click(); assert.equal(await admin.getByRole('button', { name: 'Xác nhận hủy phiếu', exact: true }).isDisabled(), true);
    await admin.getByLabel('Lý do hủy phiếu sửa chữa', { exact: true }).fill('Chờ linh kiện bổ sung; giữ UAV trong bảo trì.');
    const cancelled = await mutate(admin, 'Xác nhận hủy phiếu', `${base}/orders/${o.id}/cancel`); assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.totalMaterialCost, '300000');
    assert.equal((await api(`/api/v1/uavs/${o.uavId}`)).status, 'MAINTENANCE'); assert.equal((await readSchedule(s)).nextDueDate, s.nextDueDate);
    assert.equal(await admin.getByRole('button', { name: 'Ghi vật tư và chi phí', exact: true }).count(), 0); assert.equal(await admin.getByRole('button', { name: 'Hoàn tất phiếu sửa chữa', exact: true }).count(), 0); await shot(admin, 'cancelled-keeps-costs');
  });
  await check('stale schedule editor cannot overwrite current values and can reopen fresh data', async () => {
    const s = fixtures.staleSchedule; await workspace(admin, s.uavId); await scheduleArticle(admin, s).getByRole('button', { name: 'Chỉnh sửa lịch', exact: true }).click();
    await admin.getByLabel('Tên lịch bảo trì', { exact: true }).fill('Bản sửa cũ chưa lưu');
    const latest = await api(`${base}/schedules/${s.id}`, 'PUT', { expectedVersion: s.version, title: `Lịch đã sửa ở nơi khác ${tag}`, intervalDays: 45, nextDueDate: '2090-05-01', active: true });
    await mutate(admin, 'Lưu thay đổi lịch', `${base}/schedules/${s.id}`, 'PUT', 409); assert.equal((await readSchedule(s)).title, latest.title);
    assert.equal(await admin.getByRole('button', { name: 'Lưu thay đổi lịch', exact: true }).isDisabled(), true); await admin.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await scheduleArticle(admin, latest).getByRole('button', { name: 'Chỉnh sửa lịch', exact: true }).click(); assert.equal(await admin.getByLabel('Tên lịch bảo trì', { exact: true }).inputValue(), latest.title); assert.equal(await admin.getByLabel('Chu kỳ (ngày)', { exact: true }).inputValue(), '45');
    await admin.getByLabel('Chu kỳ (ngày)', { exact: true }).fill('60'); await mutate(admin, 'Lưu thay đổi lịch', `${base}/schedules/${s.id}`, 'PUT'); assert.equal((await readSchedule(s)).intervalDays, 60);
  }, 'browser UI plus simulated concurrent admin update via API');
  await check('due filters and server pagination keep all 24 schedules reachable', async () => {
    await workspace(admin, fixtures.listUav.id); const region = admin.getByRole('region', { name: 'Danh sách lịch bảo trì', exact: true });
    await admin.getByText('24 lịch bảo trì phù hợp bộ lọc', { exact: true }).waitFor(); assert.equal(await region.getByRole('article').count(), 20);
    await region.getByRole('button', { name: 'Sau', exact: true }).click(); await region.getByText('2 / 2', { exact: true }).waitFor(); await admin.getByText('24 lịch bảo trì phù hợp bộ lọc', { exact: true }).waitFor(); assert.equal(await region.getByRole('article').count(), 4);
    await admin.getByLabel('Lọc hạn bảo trì', { exact: true }).selectOption('OVERDUE'); await admin.getByText('21 lịch bảo trì phù hợp bộ lọc', { exact: true }).waitFor(); assert.equal(await region.locator('[data-due-status=OVERDUE]').count(), 20); await region.getByText('1 / 2', { exact: true }).waitFor();
    await region.getByRole('button', { name: 'Sau', exact: true }).click(); await region.getByText('2 / 2', { exact: true }).waitFor(); await admin.getByText('21 lịch bảo trì phù hợp bộ lọc', { exact: true }).waitFor(); assert.equal(await region.getByRole('article').count(), 1);
    for (const status of ['DUE', 'UPCOMING', 'PAUSED']) { await admin.getByLabel('Lọc hạn bảo trì', { exact: true }).selectOption(status); await region.locator(`[data-due-status=${status}]`).waitFor(); assert.equal(await region.getByRole('article').count(), 1); }
    await shot(admin, 'due-filter');
  });
  await check('mobile invalid material quantity and missing inspection prevent requests', async () => {
    await admin.setViewportSize({ width: 375, height: 812 }); await openOrder(admin, fixtures.staleOrder); await materialForm(admin, 'Dòng cần kiểm tra', '0', '10');
    const before = browserRequests.filter(r => r.method === 'PUT' && r.path.endsWith('/materials')).length;
    await admin.getByRole('button', { name: 'Lưu vật tư và chi phí', exact: true }).click(); assert.equal(await admin.getByLabel('Số lượng vật tư 1', { exact: true }).evaluate(input => input.validity.rangeUnderflow), true);
    assert.equal(browserRequests.filter(r => r.method === 'PUT' && r.path.endsWith('/materials')).length, before); assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await admin.getByLabel('Số lượng vật tư 1', { exact: true }).fill('0.125'); await admin.getByLabel('Đơn giá VND vật tư 1', { exact: true }).fill('4');
    assert.equal((await mutate(admin, 'Lưu vật tư và chi phí', `${base}/orders/${fixtures.staleOrder.id}/materials`, 'PUT')).totalMaterialCost, '1');
    await admin.getByRole('button', { name: 'Bắt đầu sửa chữa', exact: true }).click(); await mutate(admin, 'Xác nhận bắt đầu sửa chữa', `${base}/orders/${fixtures.staleOrder.id}/start`);
    await admin.getByRole('button', { name: 'Hoàn tất phiếu sửa chữa', exact: true }).click(); await admin.getByLabel('Kết quả kiểm tra sau sửa chữa', { exact: true }).fill('Kết quả chưa được xác nhận');
    assert.equal(await admin.getByRole('button', { name: 'Xác nhận hoàn tất phiếu', exact: true }).isDisabled(), true); assert.equal((await readOrder(fixtures.staleOrder)).status, 'IN_PROGRESS');
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); await shot(admin, 'mobile-required-inspection');
    await admin.getByRole('button', { name: 'Xác nhận hoàn tất phiếu', exact: true }).scrollIntoViewIfNeeded();
    const confirmBox = await admin.getByRole('button', { name: 'Xác nhận hoàn tất phiếu', exact: true }).boundingBox(); assert.ok(confirmBox && confirmBox.x >= 0 && confirmBox.x + confirmBox.width <= 375 && confirmBox.y + confirmBox.height <= 812);
    await shot(admin, 'mobile-inspection-actions'); await admin.getByRole('button', { name: 'Quay lại phiếu', exact: true }).click();
  });
  await check('operator and customer cannot enter repair workspace or read material costs', async () => {
    for (const role of ['operator', 'customer']) {
      const page = await newPage(await newContext()); await login(page, role); current = page; await page.goto('http://localhost:3102/maintenance'); await page.waitForLoadState('networkidle');
      assert.equal(await page.getByRole('button', { name: 'Tạo lịch định kỳ', exact: true }).count(), 0); assert.equal(await page.getByTestId('material-total').count(), 0);
      const text = await page.locator('body').innerText(); assert.match(text, /không có quyền|không được phép|truy cập bị từ chối|403/i); await shot(page, `denied-${role}`);
      for (const route of [base + '/schedules', base + '/orders', `${base}/orders/${fixtures.busyOrder.id}`]) { const denied = await api(route, 'GET', undefined, 403, role); assert.ok(!denied?.materials && !denied?.totalMaterialCost); }
    }
  }, 'browser access denial + direct API permission check');
  await check('browser has no uncaught runtime errors or unexpected server failures', async () => { assert.deepEqual(pageErrors, []); assert.deepEqual(browserRequests.filter(r => r.status >= 500), []); return { uncaughtErrors: 0, serverErrors: 0 }; }, 'browser runtime evidence');
} catch (error) {
  failure = { check: activeCheck, type: error.name, message: safe(error.message) }; console.log('FAIL', activeCheck, failure.message); process.exitCode = 1;
  if (current && !current.url().includes('/login')) await shot(current, 'failure').catch(() => {});
} finally {
  await browser.close();
  await fs.writeFile(path.join(work, 'browser-maintenance-negative-result.json'), JSON.stringify({ status: failure ? 'FAIL' : 'PASS', scope: 'Browser UI negative branches with separately labelled API fixtures, concurrent actor and read-back; localhost disposable data only.', results, failure, created, requests, browserRequests, pageErrors }, null, 2));
}
