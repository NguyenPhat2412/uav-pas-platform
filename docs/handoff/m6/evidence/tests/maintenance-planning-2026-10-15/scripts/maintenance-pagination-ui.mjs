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
 const auth = await api('/api/v1/auth/login', 'POST', { usernameOrEmail: fixture.users.admin.username, password: fixture.password }); token = auth.token || auth.accessToken; secrets.push(token);
 uav = await api('/api/v1/uavs', 'POST', { serialNumber: `PAGING-${tag}`, model: 'UAV phân trang', manufacturer: 'Synthetic QA' });
 for (let i=0;i<21;i++) await api('/api/v1/maintenance/schedules','POST',{uavId:uav.id,title:`Lịch phân trang ${tag} ${i}`,intervalDays:30,nextDueDate:datePlus(vietnamDate,-1)});
 await login(); await page.goto(`http://localhost:3102/maintenance?uavId=${uav.id}`); await page.getByRole('combobox',{name:'Lọc hạn bảo trì'}).selectOption('OVERDUE'); await page.getByRole('button',{name:'Sau',exact:true}).click(); await page.getByText('2 / 2',{exact:true}).waitFor(); assert.equal(await page.locator('article').count(),1);
 await page.getByRole('button',{name:'Tạm dừng lịch',exact:true}).click(); const pending=page.waitForResponse(r=>new URL(r.url()).pathname.includes('/maintenance/schedules/')&&r.request().method()==='PUT'); await page.getByRole('button',{name:'Xác nhận tạm dừng lịch',exact:true}).click(); assert.equal((await pending).status(),200); await page.getByText('Đang lưu và kiểm tra trạng thái mới nhất…').waitFor({state:'hidden'});
 await page.waitForFunction(() => document.querySelectorAll('article').length === 20);
 await page.getByText('20 lịch bảo trì phù hợp bộ lọc', {exact:true}).waitFor();
 const observation={visibleCards:await page.locator('article').count(),previousButtons:await page.getByRole('button',{name:'Trước',exact:true}).count(),matchingRecords:20};
 await screenshot('pagination-after'); results.push({name:'last filtered row removed on page2',status:observation.visibleCards===20?'PASS':'FAIL',observation}); console.log(JSON.stringify(observation));
} catch(error) { failure=sanitize(error?.stack||error); console.error(failure); }
finally { await browser.close(); await fs.writeFile(path.join(work,'maintenance-pagination-result.json'),JSON.stringify({status:failure?'FAIL':'PASS',results,failure,network},null,2)); }

if(failure||results.some(result=>result.status!=='PASS')) process.exitCode=1;
