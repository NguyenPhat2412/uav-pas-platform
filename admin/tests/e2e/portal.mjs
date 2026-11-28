import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const base = process.env.UAV_ADMIN_URL || process.env.UAV_UI_URL || 'http://localhost:3300';
const username = process.env.UAV_E2E_ADMIN_USER || 'admin';
const password = process.env.UAV_E2E_ADMIN_PASSWORD || '';
const output = process.env.UAV_UI_OUTPUT;
if (output) await mkdir(output, {recursive: true});

const adminRoutes = [
    '/admin/dashboard',
    '/admin/users',
    '/admin/access-control',
    '/admin/role-templates',
    '/admin/permissions',
    '/admin/marketplace/providers',
    '/admin/marketplace/listings',
    '/admin/marketplace/dispatch',
    '/admin/billing',
    '/admin/audit-logs',
    '/admin/settings',
    '/admin/webhooks',
    '/admin/weather',
    '/admin/airspace',
];

const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {}),
});

const checks = [];
const pageErrors = [];
const serverErrors = [];

try {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', err => pageErrors.push({route: page.url(), message: err.message}));
    page.on('response', res => {
        if (res.status() >= 500) serverErrors.push({url: res.url(), status: res.status()});
    });

    // 1. Health endpoint responds 204
    const health = await page.request.get(`${base}/health`);
    assert.equal(health.status(), 204, 'Admin /health must respond 204');
    checks.push({name: 'health', status: 'PASS'});

    // 2. Unauthenticated visit to protected admin route presents login screen cleanly
    const loginRes = await page.goto(`${base}/admin/login`);
    assert.ok(loginRes && loginRes.status() < 400, '/admin/login must load');
    assert.equal(await page.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(), 0);
    checks.push({name: 'login-screen', status: 'PASS'});

    // 3. If credentials are provided, sign in and verify core admin workspace routes
    if (password) {
        const userInput = page.locator('#auth-login-user, input[name="username"], input[type="text"]').first();
        const passInput = page.locator('#auth-login-password, input[type="password"]').first();
        await userInput.waitFor();
        await userInput.fill(username);
        await passInput.fill(password);
        const loginWait = page.waitForResponse(
            r => new URL(r.url()).pathname === '/api/v1/auth/login' && r.request().method() === 'POST',
        );
        await page.locator('button[type="submit"]').first().click();
        const authRes = await loginWait;
        assert.equal(authRes.status(), 200, 'Admin login must return 200');
        await page.waitForURL(u => !u.pathname.includes('/login'));

        for (const route of adminRoutes) {
            const res = await page.goto(`${base}${route}`);
            assert.ok(res && res.status() < 400, `${route} status`);
            await page.waitForLoadState('networkidle').catch(() => {});
            assert.equal(await page.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(), 0, route);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route}: horizontal overflow`);
            checks.push({name: route, status: 'PASS'});
        }
    }

    assert.deepEqual(pageErrors, [], `Admin page errors: ${JSON.stringify(pageErrors)}`);
    assert.deepEqual(serverErrors, [], `Admin 5xx errors: ${JSON.stringify(serverErrors)}`);

    if (output) {
        await writeFile(path.join(output, 'admin-e2e.json'), JSON.stringify({checks, pageErrors, serverErrors}, null, 2));
    }
    console.log(`Admin E2E OK: ${checks.length} checks passed`);
} finally {
    await browser.close();
}
