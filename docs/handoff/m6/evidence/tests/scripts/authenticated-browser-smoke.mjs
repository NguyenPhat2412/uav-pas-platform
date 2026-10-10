/**
 * Replay one portal at a time with disposable users only.
 * Required env: PLAYWRIGHT_MODULE, CHROMIUM_EXECUTABLE, UAV_BROWSER_FIXTURE, UAV_BROWSER_APP.
 * Optional: UAV_BROWSER_EVIDENCE (defaults to docs/handoff/m6/evidence/tests/authenticated-browser-<app>.json).
 * The fixture contains a temporary password and must never be committed.
 */
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = JSON.parse(fs.readFileSync(process.env.UAV_BROWSER_FIXTURE, 'utf8'));
const name = process.env.UAV_BROWSER_APP;
const config = { customer: { port: 3101, path: '/dashboard', identity: /tên đăng nhập hoặc email/i, password: /mật khẩu/i }, operator: { port: 3102, path: '/overview', identity: /email|tên đăng nhập/i, password: /mật khẩu|password/i }, admin: { port: 3103, path: '/dashboard', identity: /tên đăng nhập hoặc email/i, password: /mật khẩu/i } }[name];
if (!config) throw new Error('UAV_BROWSER_APP must be customer, operator or admin');
const evidencePath = process.env.UAV_BROWSER_EVIDENCE || `docs/handoff/m6/evidence/tests/authenticated-browser-${name}.json`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext();
let rewrites = 0;
const rewrite = page => page.route('http://localhost:8080/**', route => { rewrites += 1; const u = new URL(route.request().url()); return route.continue({ url: `${fixture.base}${u.pathname}${u.search}` }); });
const page = await context.newPage(); rewrite(page);
const row = { app: name, loginPage: `http://localhost:${config.port}/login`, protected: `http://localhost:${config.port}${config.path}`, unauthorizedRedirect: null, login: null, refresh: null, logout: null, postLogoutRedirect: null, localStorageKeys: null, errors: [] };
try {
  await page.goto(row.loginPage, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(config.identity).first().fill(fixture.users[name].username);
  await page.getByLabel(config.password).first().fill(fixture.password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(`**${config.path}`, { timeout: 20000 });
  await page.waitForTimeout(1200);
  row.login = 'PASS';
  row.localStorageKeys = await page.evaluate(() => ({ hasAccessToken: !!localStorage.getItem('token'), hasRefreshToken: !!localStorage.getItem('refreshToken') }));
  await page.evaluate(() => localStorage.setItem('token', 'invalid-browser-test-token'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForURL(`**${config.path}`, { timeout: 15000 });
  await page.waitForTimeout(2200);
  row.refresh = { url: new URL(page.url()).pathname, accessTokenReplaced: await page.evaluate(() => localStorage.getItem('token') !== 'invalid-browser-test-token'), refreshTokenPresent: await page.evaluate(() => !!localStorage.getItem('refreshToken')) };
  const logout = page.getByRole('button', { name: /đăng xuất|logout/i }).first();
  await logout.waitFor({ state: 'visible', timeout: 15000 });
  await logout.click();
  await page.waitForURL(/\/login(?:[/?#]|$)/, { timeout: 15000 });
  row.logout = 'PASS';
  const post = await context.newPage(); rewrite(post);
  await post.goto(row.protected, { waitUntil: 'domcontentloaded' });
  await post.waitForTimeout(600);
  row.postLogoutRedirect = row.unauthorizedRedirect = new URL(post.url()).pathname;
  await post.close();
} catch (error) { row.errors.push(String(error?.message || error)); row.failurePath = page.url(); }
await context.close(); await browser.close();
const output = { generatedAt: new Date().toISOString(), app: name, testedHead: (await import('node:child_process')).execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), environment: { apiOrigin: fixture.base, frontendPort: config.port, routeRewriteRequests: rewrites, browser: 'Playwright Chromium' }, secretsRecorded: false, scope: 'login, protected route, refresh recovery, logout and post-logout unauthorized redirect', result: row, status: row.login === 'PASS' && row.refresh?.accessTokenReplaced && row.logout === 'PASS' && row.postLogoutRedirect === '/login' && row.errors.length === 0 ? 'PASS_AUTHENTICATED_SMOKE' : 'FAIL_AUTHENTICATED_SMOKE', limitations: ['localStorage bearer per origin is not SSO', 'business mission UI, CSRF, staging and accessibility gates are outside this smoke'] };
fs.writeFileSync(evidencePath, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ app: name, status: output.status, routeRewriteRequests: rewrites, errors: row.errors }));
process.exitCode = output.status === 'PASS_AUTHENTICATED_SMOKE' ? 0 : 1;
