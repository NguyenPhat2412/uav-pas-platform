import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const base = process.env.UAV_OPERATIONS_URL || process.env.UAV_UI_URL || 'http://localhost:3200';
const output = process.env.UAV_UI_OUTPUT;
if (output) await mkdir(output, {recursive: true});

const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {}),
});

const checks = [];
const pageErrors = [];
const serverErrors = [];

try {
    for (const width of [1440, 768, 390]) {
        const context = await browser.newContext({viewport: {width, height: 900}});
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.on('pageerror', err => pageErrors.push({width, route: page.url(), message: err.message}));
        page.on('response', res => {
            if (res.status() >= 500 || (res.status() === 404 && new URL(res.url()).pathname.startsWith('/_next/'))) {
                serverErrors.push({width, url: res.url(), status: res.status()});
            }
        });

        for (const route of ['/', '/operations/login']) {
            const res = await page.goto(`${base}${route}`);
            assert.ok(res && res.status() < 400, `${width} ${route}`);
            assert.ok((await page.title()).includes('UAV PAS'), `${route}: title`);
            assert.equal(await page.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(), 0, route);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width} ${route}: overflow`);
            const broken = await page.locator('img').evaluateAll(imgs => imgs.filter(img => img.complete && img.naturalWidth === 0).map(img => img.getAttribute('src')));
            assert.deepEqual(broken, [], `${width} ${route}: broken images`);
            checks.push({width, route, status: 'PASS'});
        }
        await context.close();
    }

    assert.deepEqual(pageErrors, [], `Operations UI page errors: ${JSON.stringify(pageErrors)}`);
    assert.deepEqual(serverErrors, [], `Operations UI server/asset errors: ${JSON.stringify(serverErrors)}`);
    if (output) {
        await writeFile(path.join(output, 'operations-ui.json'), JSON.stringify({checks, pageErrors, serverErrors}, null, 2));
    }
    console.log(`Operations UI OK: ${checks.length} viewport checks passed`);
} finally {
    await browser.close();
}
