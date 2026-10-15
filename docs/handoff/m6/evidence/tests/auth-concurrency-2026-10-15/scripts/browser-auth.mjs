/** Actual browser auth acceptance against disposable local services only.
 * Existing bearer JSON + one-refresh-token-per-user policy; this is NOT SSO.
 * Credentials/tokens are kept in memory. Never save browser storage, request bodies,
 * response bodies, headers, full URLs, HAR, traces or screenshots of filled passwords.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const work = process.env.UAV_BROWSER_WORK;
assert.ok(work, 'UAV_BROWSER_WORK is required');
const fixture = JSON.parse(await fs.readFile(path.join(work, 'fixture.json'), 'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080', 'Only the isolated disposable backend is allowed');
const accessTtlMs = Number(process.env.UAV_AUTH_ACCESS_TTL_MS);
assert.ok(Number.isInteger(accessTtlMs) && accessTtlMs >= 1000 && accessTtlMs <= 10000, 'Confirm short backend TTL and set UAV_AUTH_ACCESS_TTL_MS between 1000 and 10000');
const screenshotDir = process.env.UAV_BROWSER_SCREENSHOTS || '/Volumes/D/Codex/outputs/uav-auth-concurrency-20261015';
await fs.mkdir(screenshotDir, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const contexts = new Set(), results = [], network = [], pageErrors = [], requestFailures = [];
const secrets = new Set([fixture.password]);
let activeCheck = 'initialize', failure;
const portals = [
  { role: 'customer', port: 3101, route: '/missions', heading: 'Nhiệm vụ của tôi', resource: '/api/v1/missions' },
  { role: 'operator', port: 3102, route: '/assigned-missions', heading: 'Nhiệm vụ được giao', resource: '/api/v1/missions' },
  { role: 'admin', port: 3103, route: '/audit-logs', heading: 'Nhật ký quản trị', resource: '/api/v1/audit-logs' },
];
function safe(value) {
  let text = String(value).replace(/https?:\/\/\S+/g, '[URL]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED]');
  for (const secret of secrets) if (secret) text = text.split(secret).join('[REDACTED]');
  return text;
}
async function check(name, task) {
  activeCheck = name; console.log('START', name);
  const detail = await task();
  results.push({ name, status: 'PASS', mode: 'actual browser UI', ...(detail ? { detail } : {}) });
  console.log('PASS', name);
}
async function createPage(label) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  contexts.add(context); context.setDefaultTimeout(20000); context.setDefaultNavigationTimeout(30000);
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push({ browser: label, message: safe(error.message) }));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === fixture.base) network.push({ browser: label, method: response.request().method(), path: url.pathname, status: response.status() });
  });
  page.on('requestfailed', request => {
    const url = new URL(request.url());
    if (url.origin === fixture.base) requestFailures.push({ browser: label, method: request.method(), path: url.pathname, failure: request.failure()?.errorText?.includes('ERR_ABORTED') ? 'ABORTED' : 'NETWORK_ERROR' });
  });
  return { context, page, label };
}
async function close(item) { await item.context.close(); contexts.delete(item.context); }
async function waitForAuth(page, endpoint) {
  return page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/auth/${endpoint}` && response.request().method() === 'POST');
}
async function sessionExpiry(response) {
  assert.equal(response.status(), 200, `Auth endpoint returned HTTP ${response.status()}`);
  const session = await response.json();
  // Observe the existing schema without emitting token values or the user object.
  assert.deepEqual(Object.keys(session).sort(), ['accessToken', 'refreshToken', 'tokenType', 'user']);
  assert.equal(session.tokenType, 'Bearer');
  assert.ok(typeof session.accessToken === 'string' && typeof session.refreshToken === 'string');
  assert.ok(session.user && Number.isInteger(session.user.id));
  secrets.add(session.accessToken); secrets.add(session.refreshToken);
  const payload = JSON.parse(Buffer.from(session.accessToken.split('.')[1], 'base64url').toString('utf8'));
  assert.ok(Number.isInteger(payload.exp) && Number.isInteger(payload.iat));
  assert.ok(Math.abs((payload.exp - payload.iat) * 1000 - accessTtlMs) <= 1000, 'Observed access lifetime must match configured short test TTL');
  return payload.exp * 1000;
}
async function prepareLogin(page, portal, role = portal.role) {
  await page.goto(`http://localhost:${portal.port}/login`);
  await page.locator('input[type=password]').waitFor();
  await page.locator('input').first().fill(fixture.users[role].username);
  await page.locator('input[type=password]').fill(fixture.password);
}
async function authenticated(page, portal) {
  await page.getByRole('button', { name: /Đăng xuất/ }).waitFor();
  assert.notEqual(new URL(page.url()).pathname, '/login');
  assert.equal(await page.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(), 0);
  if (portal.heading) await page.getByRole('heading', { name: portal.heading, exact: true, level: 1 }).waitFor();
}
async function login(page, portal) {
  await prepareLogin(page, portal);
  const responsePromise = waitForAuth(page, 'login');
  await page.locator('button[type=submit]').click();
  const expires = await sessionExpiry(await responsePromise);
  await page.waitForURL(url => !url.pathname.includes('login'));
  await page.goto(`http://localhost:${portal.port}${portal.route}`);
  await authenticated(page, portal);
  return expires;
}
async function waitForNaturalExpiry(expires, pages) {
  const milliseconds = Math.max(0, expires + 350 - Date.now());
  assert.ok(milliseconds <= 11500, 'Refusing long waits or a production access lifetime');
  // Real wall-clock expiry. Do not rewrite storage, tokens, browser clocks or API responses.
  await new Promise(resolve => setTimeout(resolve, milliseconds));
  assert.ok(Date.now() > expires);
  for (const page of pages) assert.ok(!page.isClosed());
}
async function refreshedProtected(item, portal, expires) {
  const before = network.length;
  await waitForNaturalExpiry(expires, [item.page]);
  const refreshPromise = waitForAuth(item.page, 'refresh');
  const resourcePromise = item.page.waitForResponse(response => new URL(response.url()).pathname.startsWith(portal.resource) && response.request().method() === 'GET' && response.status() === 200);
  await item.page.reload();
  const refresh = await refreshPromise;
  const nextExpiry = await sessionExpiry(refresh);
  await resourcePromise; await authenticated(item.page, portal);
  const observed = network.slice(before).filter(row => row.browser === item.label);
  assert.ok(observed.some(row => row.path === '/api/v1/auth/me' && row.status === 401), 'Expired access must be rejected before refresh');
  assert.equal(observed.filter(row => row.path === '/api/v1/auth/refresh' && row.status === 200).length, 1, 'One successful refresh for this reload');
  assert.equal(new URL(item.page.url()).pathname, portal.route);
  return nextExpiry;
}
async function loggedOutAndGuarded(item, portal) {
  const responsePromise = waitForAuth(item.page, 'logout');
  await item.page.getByRole('button', { name: /Đăng xuất/ }).click();
  assert.equal((await responsePromise).status(), 200);
  await item.page.waitForURL(url => url.pathname === '/login');
  const stored = await item.page.evaluate(() => ({ accessPresent: !!localStorage.getItem('token'), refreshPresent: !!localStorage.getItem('refreshToken') }));
  assert.deepEqual(stored, { accessPresent: false, refreshPresent: false });
  await item.page.goto(`http://localhost:${portal.port}${portal.route}`);
  await item.page.waitForURL(url => url.pathname === '/login');
  assert.equal(await item.page.getByRole('button', { name: /Đăng xuất/ }).count(), 0);
  assert.equal(await item.page.getByRole('heading', { name: portal.heading, exact: true, level: 1 }).count(), 0);
}
async function screenshot(page, name) {
  // Only authenticated pages or empty reauthentication forms; never capture filled credentials.
  if (new URL(page.url()).pathname === '/login') {
    await page.locator('input[type=password]').fill('');
    await page.locator('input').first().fill('');
  }
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: false });
}

try {
  for (const portal of portals) {
    const item = await createPage(`${portal.role}-portal`);
    let expires;
    await check(`${portal.role}: UI login and protected route`, async () => { expires = await login(item.page, portal); return { port: portal.port, protectedPath: portal.route }; });
    await check(`${portal.role}: natural access expiry, refresh and protected data reload`, async () => { expires = await refreshedProtected(item, portal, expires); await screenshot(item.page, `${portal.role}-refreshed`); });
    await check(`${portal.role}: UI logout clears session and protected route returns to login`, async () => { await loggedOutAndGuarded(item, portal); });
    await close(item);
  }

  const portal = portals[0];
  const first = await createPage('parallel-customer-A'), second = await createPage('parallel-customer-B');
  const pair = [first, second];
  let expiries = [], winner, loser, winnerExpiry;
  await check('same account: two independent browser UI logins both return 200', async () => {
    await Promise.all(pair.map(item => prepareLogin(item.page, portal)));
    // A release barrier makes the two real UI requests reach the backend together;
    // requests are continued unchanged, with no fake response or injected auth data.
    let release;
    const barrier = new Promise(resolve => { release = resolve; });
    let arrivals = 0;
    const handler = async route => {
      arrivals += 1;
      if (arrivals === 2) release();
      await Promise.race([barrier, new Promise((_, reject) => setTimeout(() => reject(new Error('Concurrent login barrier was not reached by both browsers')), 5000))]);
      await route.continue();
    };
    await Promise.all(pair.map(item => item.page.route('**/api/v1/auth/login', handler)));
    const replies = pair.map(item => waitForAuth(item.page, 'login'));
    await Promise.all(pair.map(item => item.page.locator('button[type=submit]').click()));
    expiries = await Promise.all((await Promise.all(replies)).map(response => sessionExpiry(response)));
    assert.equal(arrivals, 2);
    await Promise.all(pair.map(item => item.page.unroute('**/api/v1/auth/login', handler)));
    await Promise.all(pair.map(async item => { await item.page.waitForURL(url => !url.pathname.includes('login')); await item.page.goto(`http://localhost:${portal.port}${portal.route}`); await authenticated(item.page, portal); }));
    return { independentBrowserContexts: 2, successfulLoginResponses: 2, policy: 'one refresh token per user; current access tokens retain existing lifetime' };
  });
  await check('same account: after natural expiry only current refresh succeeds; replaced refresh returns 401 and UI reauthenticates', async () => {
    const before = network.length;
    await waitForNaturalExpiry(Math.max(...expiries), pair.map(item => item.page));
    const replies = pair.map(item => waitForAuth(item.page, 'refresh'));
    await Promise.all(pair.map(item => item.page.reload()));
    const responses = await Promise.all(replies);
    assert.deepEqual(responses.map(response => response.status()).sort(), [200, 401]);
    const winnerIndex = responses.findIndex(response => response.status() === 200);
    winner = pair[winnerIndex]; loser = pair[1 - winnerIndex];
    winnerExpiry = await sessionExpiry(responses[winnerIndex]);
    await authenticated(winner.page, portal);
    await loser.page.waitForURL(url => url.pathname === '/login');
    assert.deepEqual(await loser.page.evaluate(() => [!!localStorage.getItem('token'), !!localStorage.getItem('refreshToken')]), [false, false]);
    await loser.page.goto(`http://localhost:${portal.port}${portal.route}`); await loser.page.waitForURL(url => url.pathname === '/login');
    for (const item of pair) assert.ok(network.slice(before).some(row => row.browser === item.label && row.path === '/api/v1/auth/me' && row.status === 401));
    await screenshot(loser.page, 'parallel-replaced-refresh-reauth'); await screenshot(winner.page, 'parallel-current-refresh-protected');
    return { refreshStatuses: [200, 401], unauthorizedBrowserSessionCleared: true, protectedRouteDeniedAfterRefreshFailure: true };
  });
  await check('replaced session can log in again; previous refresh then requires reauthentication without creating multi-session policy', async () => {
    const currentExpiry = await login(loser.page, portal);
    await waitForNaturalExpiry(winnerExpiry, [winner.page, loser.page]);
    const rejected = waitForAuth(winner.page, 'refresh');
    await winner.page.reload(); assert.equal((await rejected).status(), 401);
    await winner.page.waitForURL(url => url.pathname === '/login');
    assert.deepEqual(await winner.page.evaluate(() => [!!localStorage.getItem('token'), !!localStorage.getItem('refreshToken')]), [false, false]);
    await refreshedProtected(loser, portal, currentExpiry);
    await loggedOutAndGuarded(loser, portal);
    return { replacedBrowserLogin: 'PASS', previousRefreshRejected: 'PASS', currentSessionRefreshAndLogout: 'PASS' };
  });
  await Promise.all(pair.map(close));
  await check('browser diagnostics contain no runtime errors, transport failures or server 5xx', async () => {
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(requestFailures.filter(row => row.failure !== 'ABORTED'), []);
    assert.deepEqual(network.filter(row => row.status >= 500), []);
    assert.deepEqual(network.filter(row => row.path === '/api/v1/auth/login' && row.status !== 200), []);
    return { expected401s: network.filter(row => row.status === 401).length, recordedRequestBodies: false, recordedCredentialsOrTokens: false };
  });
} catch (error) {
  failure = safe(error?.stack || error);
  results.push({ name: activeCheck, status: 'FAIL', detail: failure });
  console.error(failure);
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
  await fs.writeFile(path.join(work, 'browser-auth-result.json'), JSON.stringify({
    status: failure ? 'FAIL' : 'PASS', configuredAccessTtlMs: accessTtlMs,
    coverage: 'Existing bearer JSON contract and one refresh token per user; real local browser login/expiry/refresh/logout. No SSO, cookies or CSRF changes tested.',
    results, network, pageErrors, requestFailures, secretsRecorded: false, screenshots: screenshotDir,
  }, null, 2));
}
if (failure) process.exitCode = 1;
