import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

export {assert, fs, path};
export const work = process.env.UAV_E2E_PRIVATE_DIR;
if (!work || !process.env.UAV_E2E_RESULT_DIR) throw new Error('E2E directories required');
export const out = process.env.UAV_E2E_RESULT_DIR;
export const fixture = JSON.parse(await fs.readFile(path.join(work, 'fixture.json'), 'utf8'));
await fs.mkdir(out, {recursive: true});
export const origin = app => `http://localhost:${fixture.ports.web}${app === 'web' ? '' : '/' + app}`;
export const secretValues = new Set([fixture.password]);
const routePath = value => value.split('?')[0].replace(/\/\d+(?=\/|$)/g, '/:id');
export const network = [], errors = [], failed = [], checks = [], consoleMessages = [];

export function safe(s) {
    let t = String(s).replace(/https?:\/\/[^\s]+/g, '[URL]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[TOKEN]');
    for (const v of secretValues) if (v) t = t.split(v).join('[REDACTED]');
    return t;
}

export async function launch() {
    return chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
}

export async function pageFor(browser, label, area, role, route) {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    let access;
    page.on('pageerror', e => errors.push({label, type: 'PAGE_ERROR'}));
    page.on('console', m => {
        if (['warning', 'error'].includes(m.type())) consoleMessages.push({label, type: m.type()});
    });
    page.on('response', r => {
        const u = new URL(r.url());
        if (u.origin === fixture.base) network.push({
            label,
            method: r.request().method(),
            path: routePath(u.pathname),
            status: r.status()
        });
    });
    page.on('requestfailed', r => {
        if (new URL(r.url()).origin === fixture.base) failed.push({
            label,
            path: routePath(new URL(r.url()).pathname),
            error: r.failure()?.errorText?.includes('ABORTED') ? 'ABORTED' : 'NETWORK_ERROR'
        });
    });
    page.on('dialog', d => d.accept());
    await page.goto(`${origin(area)}/login`);
    await page.locator('input[type=password]').waitFor();
    await page.locator('input').first().fill(fixture.users[role].username);
    await page.locator('input[type=password]').fill(fixture.password);
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/login' && r.request().method() === 'POST');
    await page.locator('button[type=submit]').click();
    const login = await response;
    assert.equal(login.status(), 200);
    const session = await login.json();
    secretValues.add(session.accessToken);
    secretValues.add(session.refreshToken);
    access = session.accessToken;
    await page.waitForURL(u => !u.pathname.includes('/login'));
    await page.goto(`${origin(area)}${route}`);
    await page.getByRole('button', {name: /Đăng xuất/}).waitFor();
    assert.ok((await page.title()).length > 0);
    assert.equal(await page.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(), 0);
    return {page, context, token: access, user: session.user, area};
}

export async function api(token, method, endpoint, body, expected = 200) {
    const r = await fetch(fixture.base + endpoint, {
        signal: AbortSignal.timeout(15000),
        method,
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
        }, ...(body === undefined ? {} : {body: JSON.stringify(body)})
    });
    network.push({label: 'API fixture/read-back', method, path: routePath(endpoint), status: r.status});
    const text = await r.text();
    let data;
    try {
        data = JSON.parse(text)
    } catch {
        data = text
    }
    assert.equal(r.status, expected, `${method} ${endpoint.split('?')[0]} status=${r.status}`);
    return data;
}

export async function check(name, fn) {
    console.log('START', name);
    try {
        const detail = await fn();
        checks.push({name, status: 'PASS', detail});
        console.log('PASS', name)
    } catch (e) {
        checks.push({name, status: 'FAIL'});
        throw e;
    }
}

// Screenshots, traces, HAR, raw errors and response bodies are deliberately not artifacts.
export async function shot() {
}

export async function finish(name, error) {
    if (error) await fs.writeFile(path.join(work, 'failure-diagnostic.json'), JSON.stringify({
        type: error.name,
        message: safe(String(error.message).split('\n')[0])
    }));
    const result = {
        status: error ? 'FAIL' : 'PASS',
        checks,
        network,
        pageErrors: errors,
        consoleMessages,
        requestFailures: failed
    };
    await fs.writeFile(path.join(out, name + '.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({status: result.status, checks: checks.length, pageErrors: errors.length}));
}
