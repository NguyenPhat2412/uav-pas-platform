import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const work = process.env.UAV_BROWSER_WORK, shots = process.env.UAV_BROWSER_SCREENSHOTS;
const fixture = JSON.parse(await fs.readFile(path.join(work, 'fixture.json'), 'utf8'));
const previous = JSON.parse(await fs.readFile(path.join(work, 'maintenance-happy-ui-result.json'), 'utf8'));
const uavId = previous.results[0].details.uavId;
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(); page.setDefaultTimeout(25000);
let token, failure; const results = [], network = [], pageErrors = [];
const unwrap = value => value && typeof value === 'object' && 'data' in value ? value.data : value;
async function api(route, method = 'GET', body) { const r = await fetch(fixture.base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); assert.ok(r.ok, `HTTP ${r.status}`); return unwrap(await r.json()); }
page.on('pageerror', () => pageErrors.push('Browser runtime error'));
page.on('response', response => { const u = new URL(response.url()); if (u.port === '18080') network.push({ path: u.pathname, method: response.request().method(), status: response.status() }); });
try {
 const auth = await api('/api/v1/auth/login', 'POST', { usernameOrEmail: fixture.users.admin.username, password: fixture.password }); token = auth.token || auth.accessToken;
 const orders = await api(`/api/v1/maintenance/orders?uavId=${uavId}`); const completed = orders.content.find(order => order.status === 'COMPLETED'); assert.ok(completed);
 await page.goto('http://localhost:3102/login'); await page.waitForLoadState('networkidle'); await page.locator('input').first().fill(fixture.users.admin.username); await page.locator('input[type=password]').fill(fixture.password); await page.locator('button[type=submit]').click(); await page.waitForURL(u => !u.pathname.includes('login'));
 await page.goto('http://localhost:3102/audit'); await page.getByRole('heading', {name:'Nhật ký hoạt động',exact:true}).waitFor(); const search = page.getByRole('textbox', { name: /Tìm.*Nhật ký hoạt động/ }); await search.fill('Hoàn tất');
 const completedRow = page.getByRole('row').filter({ hasText: `Phiếu sửa chữa ${completed.id}` }); await completedRow.waitFor(); assert.match(await completedRow.innerText(), /Hoàn tất/); assert.match(await completedRow.innerText(), new RegExp(fixture.users.admin.username));
 results.push({ name: 'admin sees completed repair audit with actor/time', status: 'PASS', mode: 'browser UI; completed order from prior UI lifecycle' });
 await search.fill(`Cập nhật kỳ bảo trì tiếp theo sau phiếu #${completed.id}`); const advancedRow = page.getByRole('row').filter({ hasText: `Lịch bảo trì ${completed.scheduleId}` }); await advancedRow.waitFor(); assert.match(await advancedRow.innerText(), /Cập nhật kỳ bảo trì tiếp theo/);
 await page.screenshot({ path: path.join(shots, 'maintenance-planning-audit.png') });
 results.push({ name: 'admin sees linked schedule advancement audit', status: 'PASS', mode: 'browser UI' });
 assert.equal(pageErrors.length, 0); assert.deepEqual(network.filter(item => item.status >= 400), []);
} catch (error) { failure = String(error?.message || error).replaceAll(fixture.password, '[REDACTED]').replace(/https?:\/\/\S+/g, '[URL]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED]'); results.push({ name: 'audit UI', status: 'FAIL', detail: failure }); }
finally { await browser.close(); await fs.writeFile(path.join(work, 'maintenance-audit-ui-result.json'), JSON.stringify({ status: failure ? 'FAIL' : 'PASS', results, network, pageErrors }, null, 2)); }
console.log(JSON.stringify({ status: failure ? 'FAIL' : 'PASS', results }, null, 2)); if (failure) process.exitCode = 1;
