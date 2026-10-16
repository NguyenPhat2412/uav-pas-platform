/** Disposable, actual-backend checks. No mocked responses, tokens, passwords, storage states or signed URLs are recorded. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const work = process.env.UAV_BROWSER_WORK;
const shots = process.env.UAV_BROWSER_SCREENSHOTS;
assert.ok(work && shots, 'Set local work and screenshot folders');
const fixture = JSON.parse(await fs.readFile(`${work}/fixture.json`, 'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080', 'Disposable backend only');
await fs.mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(20000);
const page = await context.newPage();
const results = [], network = [], errors = [], createdMissionIds = [];
let currentTest = '', currentPage = page, failure = false;
const tag = `BA-CUSTOMER-${Date.now()}`;
function watch(p) {
  p.on('pageerror', () => errors.push({ kind: 'pageerror' }));
  p.on('response', response => {
    const url = new URL(response.url());
    if (url.port === '18080') network.push({ method: response.request().method(), path: url.pathname, status: response.status() });
  });
}
watch(page);
async function check(name, fn) { currentTest = name; console.log('START', name); await fn(); results.push({ name, status: 'PASS' }); console.log('PASS', name); }
async function api(path, token, method = 'GET', data) {
  const response = await fetch(`${fixture.base}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  assert.ok(response.ok, `${method} ${path.split('?')[0]} HTTP ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
async function apiLogin(role) {
  return (await api('/api/v1/auth/login', undefined, 'POST', { usernameOrEmail: fixture.users[role].username, password: fixture.password })).accessToken;
}
async function login(p, role) {
  await p.goto('http://localhost:3101/login');
  await p.locator('input').first().fill(fixture.users[role].username);
  await p.locator('input[type=password]').fill(fixture.password);
  await p.locator('button[type=submit]').click();
  await p.waitForURL(url => !url.pathname.includes('login'));
  await p.getByRole('button', { name: /Đăng xuất/ }).waitFor();
}
const draft = (title, extra = {}) => ({ missionType: 'AREA_INSPECTION', title, description: 'Mô tả tổng hợp ban đầu', requestedDate: '2030-06-01', startTime: '2030-06-01T09:00:00', expectedEndTime: '2030-06-01T10:00:00', locationName: 'Khu vực thử nghiệm Hà Nội', latitude: 0, longitude: 105.1234567, priority: 'NORMAL', notes: 'Ghi chú tổng hợp ban đầu', ...extra });
let token, original, updated;
try {
  token = await apiLogin('customer');
  await check('customer logs in through real UI', () => login(page, 'customer'));
  const services = await api('/api/v1/uav-services', token);
  original = await api('/api/v1/missions', token, 'POST', draft(`${tag} edit`, { serviceId: services[0]?.id }));
  createdMissionIds.push(original.id);
  await page.goto(`http://localhost:3101/missions/${original.id}`);
  await check('draft detail opens complete edit form with original values', async () => {
    await page.getByRole('link', { name: 'Chỉnh sửa bản nháp', exact: true }).click();
    await page.getByRole('heading', { name: 'Chỉnh sửa bản nháp' }).waitFor();
    assert.equal(await page.locator('input#mission-title').inputValue(), original.title);
    assert.equal(await page.locator('#mission-notes').inputValue(), original.notes);
    assert.equal(await page.locator('#mission-latitude').inputValue(), '0');
    assert.equal(await page.locator('#mission-missionType').count(), 0);
    assert.equal(await page.locator('#mission-serviceId').count(), 0);
  });
  await check('draft rejects whitespace title and end before start without an API mutation', async () => {
    const before = network.filter(item => item.method === 'PATCH').length;
    await page.locator('input#mission-title').fill('   ');
    await page.locator('#mission-expectedEndTime').fill('2030-06-01T08:00');
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await page.locator('#mission-title-error').waitFor();
    await page.locator('#mission-expectedEndTime-error').waitFor();
    assert.equal(network.filter(item => item.method === 'PATCH').length, before);
    await page.waitForFunction(() => document.activeElement?.id === 'mission-error-summary');
  });
  await check('draft edits all supported fields and preserves service and mission type', async () => {
    const changes = { title: `${tag} updated`, description: 'Nội dung đã sửa qua giao diện', requestedDate: '2030-06-02', startTime: '2030-06-02T11:00', expectedEndTime: '2030-06-02T12:30', locationName: 'Điểm khảo sát cập nhật', latitude: '21.028511', longitude: '105.804817', notes: 'Ghi chú đã sửa qua giao diện' };
    for (const [key, value] of Object.entries(changes)) await page.locator(`#mission-${key}`).fill(value);
    await page.locator('#mission-priority').selectOption('HIGH');
    const saving = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/missions/${original.id}` && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    const response = await saving;
    assert.equal(response.status(), 200);
    await page.waitForURL(`**/missions/${original.id}`);
    await page.getByRole('heading', { name: changes.title, exact: true }).waitFor();
    updated = await api(`/api/v1/missions/${original.id}`, token);
    for (const key of ['title', 'description', 'requestedDate', 'locationName', 'notes']) assert.equal(updated[key], changes[key], key);
    for (const key of ['startTime', 'expectedEndTime']) assert.equal(updated[key].slice(0, 16), changes[key], key);
    assert.equal(updated.latitude, Number(changes.latitude)); assert.equal(updated.longitude, Number(changes.longitude));
    assert.equal(updated.priority, 'HIGH'); assert.equal(updated.serviceId, original.serviceId); assert.equal(updated.missionType, original.missionType);
    assert.equal(updated.status, 'DRAFT'); assert.equal(updated.customerId, original.customerId);
    const timeline = await api(`/api/v1/missions/${original.id}/timeline`, token);
    assert.ok(timeline.some(event => event.eventType === 'UPDATED'));
    await page.screenshot({ path: `${shots}/customer-edited-draft.png`, fullPage: true });
  });
  await check('stale draft edit receives actual 409 and reloads changed status without overwriting', async () => {
    await page.getByRole('link', { name: 'Chỉnh sửa bản nháp', exact: true }).click();
    await page.locator('input#mission-title').fill(`${tag} MUST NOT SAVE`);
    const submitted = await api(`/api/v1/missions/${original.id}/submit`, token, 'POST');
    assert.equal(submitted.status, 'PENDING_CONFIRMATION');
    const saving = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/missions/${original.id}` && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    assert.equal((await saving).status(), 409);
    await page.getByText('Yêu cầu đã chuyển trạng thái. Chỉ bản nháp mới có thể chỉnh sửa.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).count(), 0);
    const after = await api(`/api/v1/missions/${original.id}`, token);
    assert.equal(after.title, updated.title); assert.equal(after.status, 'PENDING_CONFIRMATION');
    await page.screenshot({ path: `${shots}/customer-stale-edit.png`, fullPage: true });
  });
  await check('customer B cannot open customer A edit form', async () => {
    const otherContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    otherContext.setDefaultTimeout(20000);
    const other = await otherContext.newPage(); currentPage = other; watch(other);
    await login(other, 'customer_b');
    await other.goto(`http://localhost:3101/missions/${original.id}/edit`);
    await other.getByText('Không thể tải nhiệm vụ hoặc bạn không có quyền truy cập.', { exact: false }).waitFor();
    assert.equal(await other.locator('input#mission-title').count(), 0);
    assert.equal(await other.getByRole('button', { name: 'Lưu thay đổi', exact: true }).count(), 0);
    assert.equal(await other.getByText(updated.title, { exact: true }).count(), 0);
    await other.screenshot({ path: `${shots}/customer-ownership-edit-blocked.png`, fullPage: true });
    await otherContext.close(); currentPage = page;
  });
  const custom = services.find(service => service.active && !['UAV_RENTAL', 'AREA_INSPECTION', 'AERIAL_RECORDING', 'DATA_COLLECTION', 'OTHER'].includes(service.code));
  if (custom) await check('custom service catalogue code creates valid MissionType through UI', async () => {
    await page.goto('http://localhost:3101/missions/create');
    await page.locator('#mission-serviceId').selectOption(String(custom.id));
    assert.equal(await page.locator('#mission-missionType').inputValue(), 'AREA_INSPECTION');
    const data = draft(`${tag} custom service`);
    for (const key of ['title', 'requestedDate', 'startTime', 'expectedEndTime', 'locationName']) await page.locator(`#mission-${key}`).fill(['startTime', 'expectedEndTime'].includes(key) ? data[key].slice(0, 16) : data[key]);
    await page.getByRole('button', { name: 'Kiểm tra & xem lại', exact: true }).click();
    const saving = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/missions' && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
    const response = await saving; assert.equal(response.status(), 201);
    const created = await response.json(); createdMissionIds.push(created.id);
    assert.equal(created.serviceId, custom.id); assert.equal(created.missionType, 'AREA_INSPECTION');
    await page.waitForURL(`**/missions/${created.id}`);
  }); else results.push({ name: 'custom service catalogue code creates valid MissionType through UI', status: 'BLOCKED', reason: 'No active custom service fixture in disposable catalogue' });
  const pageTag = `${tag} PAGE`;
  await check('seed 23 owned synthetic drafts for pagination', async () => {
    for (let index = 1; index <= 23; index++) { const item = await api('/api/v1/missions', token, 'POST', draft(`${pageTag} item-${String(index).padStart(2, '0')}`)); createdMissionIds.push(item.id); }
  });
  await check('customer reaches items beyond first twenty and search resets page', async () => {
    await page.goto('http://localhost:3101/missions');
    await page.getByLabel('Tìm nhiệm vụ', { exact: true }).fill(pageTag);
    await page.getByText('Hiển thị 1–20 / 23 nhiệm vụ', { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 20);
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await page.getByText('Hiển thị 21–23 / 23 nhiệm vụ', { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 3);
    await page.getByLabel('Tìm nhiệm vụ', { exact: true }).fill(`${pageTag} item-01`);
    await page.getByText('Hiển thị 1–1 / 1 nhiệm vụ', { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 1);
    assert.ok((await page.locator('tbody').innerText()).includes('item-01'));
  });
  await check('status filter resets page and empty state does not show stale rows', async () => {
    await page.getByLabel('Tìm nhiệm vụ', { exact: true }).fill(pageTag);
    await page.getByText('Hiển thị 1–20 / 23 nhiệm vụ', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await page.getByText('Hiển thị 21–23 / 23 nhiệm vụ', { exact: true }).waitFor();
    await page.locator('.filter-row select').selectOption('PENDING_CONFIRMATION');
    await page.getByText('Không tìm thấy nhiệm vụ theo bộ lọc đã chọn.', { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 0);
    await page.locator('.filter-row select').selectOption('DRAFT');
    await page.getByText('Hiển thị 1–20 / 23 nhiệm vụ', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
    assert.equal(await page.getByLabel('Tìm nhiệm vụ', { exact: true }).inputValue(), '');
    assert.equal(await page.locator('.filter-row select').inputValue(), '');
  });
  await check('mobile pagination and complete draft form have no horizontal overflow', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByLabel('Tìm nhiệm vụ', { exact: true }).fill(pageTag);
    await page.getByText('Hiển thị 1–20 / 23 nhiệm vụ', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await page.getByText('Hiển thị 21–23 / 23 nhiệm vụ', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${shots}/customer-pagination-mobile.png`, fullPage: true });
    await page.goto(`http://localhost:3101/missions/${createdMissionIds.at(-1)}/edit`);
    await page.locator('input#mission-title').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).scrollIntoViewIfNeeded();
    assert.ok(await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).isVisible());
    await page.screenshot({ path: `${shots}/customer-draft-edit-mobile.png`, fullPage: true });
  });
  await check('no page exceptions or unexpected server errors', async () => {
    assert.equal(errors.length, 0);
    assert.deepEqual(network.filter(item => item.status >= 500), []);
  });
} catch (error) {
  failure = true;
  results.push({ name: currentTest || 'setup', status: 'FAIL', errorType: error.name || 'Error' });
  const diagnostic = String(error.message ?? '').split('\n')[0].replaceAll(fixture.password, '[REDACTED]').replaceAll(token || '[NO_TOKEN]', '[REDACTED]').replace(/https?:\/\/\S+/g, '[URL]').slice(0, 300);
  results.at(-1).diagnostic = diagnostic;
  console.log('FAIL', currentTest || 'setup', error.name || 'Error', diagnostic);
  await currentPage.screenshot({ path: `${shots}/customer-extended-failure.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await fs.writeFile(`${work}/customer-extended-result.json`, JSON.stringify({ status: failure ? 'FAIL' : results.some(result => result.status === 'BLOCKED') ? 'PARTIAL' : 'PASS', results, createdMissionIds, errors, network }, null, 2));
  await browser.close();
}
