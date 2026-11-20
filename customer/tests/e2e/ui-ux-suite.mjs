import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const BASE_URL = process.env.UAV_UI_URL || 'http://localhost:3100';
const OUTPUT_DIR = process.env.UAV_UI_OUTPUT || '';

const VIEWPORTS = [
    {name: 'mobile', width: 375, height: 812},
    {name: 'tablet', width: 768, height: 1024},
    {name: 'desktop', width: 1440, height: 900},
];

const PUBLIC_ROUTES = ['/', '/about', '/services', '/solutions', '/pricing', '/contact', '/faq'];

const report = {
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    checks: [],
    pageErrors: [],
    serverErrors: [],
    consoleErrors: [],
};

function attachObservers(page, label) {
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(20000);
    page.on('pageerror', error => {
        report.pageErrors.push({label, message: error.message});
    });
    page.on('console', msg => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        // Unauthenticated bootstrap checks to /auth/me or /auth/refresh returning 401 are expected on public pages.
        if (/\/auth\/(me|refresh)/.test(msg.location().url || '') && /(?:400|401)/.test(text)) return;
        report.consoleErrors.push({label, message: text});
    });
    page.on('response', res => {
        if (res.status() >= 500) {
            report.serverErrors.push({label, url: new URL(res.url()).pathname, status: res.status()});
        }
    });
}

async function auditPageResponsiveAndA11y(page, route, viewport) {
    const label = `${viewport.name}:${route}`;
    await page.setViewportSize({width: viewport.width, height: viewport.height});
    const response = await page.goto(`${BASE_URL}${route}`, {waitUntil: 'domcontentloaded'});
    assert.ok(response && response.status() < 400, `${label}: HTTP status ${response?.status()}`);
    await page.waitForLoadState('networkidle').catch(() => {});

    // 1. No Next.js runtime/build error overlay
    assert.equal(
        await page.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(),
        0,
        `${label}: runtime error overlay detected`,
    );

    // 2. Meaningful title and body content
    const title = await page.title();
    assert.ok(title.trim().length > 0, `${label}: document title must not be empty`);
    const bodyText = (await page.locator('body').innerText()).trim();
    assert.ok(bodyText.length > 40, `${label}: page rendered insufficient content`);

    // 3. Zero horizontal overflow across viewports
    const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
    }));
    assert.ok(
        overflow.scrollWidth <= overflow.innerWidth + 1,
        `${label}: horizontal overflow detected (${overflow.scrollWidth}px > ${overflow.innerWidth}px)`,
    );

    // 4. All loaded images must render with non-zero width and declare alt attribute
    const imageIssues = await page.locator('img').evaluateAll(imgs =>
        imgs
            .filter(img => {
                const style = window.getComputedStyle(img);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .map(img => ({
                src: img.getAttribute('src'),
                broken: img.complete && img.naturalWidth === 0,
                missingAlt: !img.hasAttribute('alt'),
            }))
            .filter(item => item.broken || item.missingAlt),
    );
    assert.deepEqual(imageIssues, [], `${label}: broken or alt-less images: ${JSON.stringify(imageIssues)}`);

    // 5. Semantic heading hierarchy: at least one visible h1 on desktop
    if (viewport.name === 'desktop') {
        const h1Count = await page.locator('h1').evaluateAll(
            nodes =>
                nodes.filter(n => {
                    const rect = n.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }).length,
        );
        assert.ok(h1Count >= 1, `${label}: expected at least 1 visible <h1> heading`);
    }

    // 6. Accessible names on visible interactive buttons
    const namelessButtons = await page.locator('button:visible').evaluateAll(buttons =>
        buttons
            .filter(btn => {
                const text = (btn.innerText || btn.textContent || '').trim();
                const aria = (btn.getAttribute('aria-label') || btn.getAttribute('title') || '').trim();
                return text.length === 0 && aria.length === 0;
            })
            .map(btn => btn.outerHTML.slice(0, 100)),
    );
    assert.deepEqual(
        namelessButtons,
        [],
        `${label}: visible buttons without accessible name: ${JSON.stringify(namelessButtons)}`,
    );

    report.checks.push({route, viewport: viewport.name, status: 'PASS'});
    console.log(`PASS [${viewport.name.padEnd(7)}] ${route}`);
}

async function auditAuthModalKeyboardAndValidationUx(browser) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    const page = await context.newPage();
    attachObservers(page, 'ux:auth-modal');

    await page.goto(`${BASE_URL}/?auth=login`, {waitUntil: 'domcontentloaded'});
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({state: 'visible'});

    // Focus should land inside the modal after Tab navigation
    await page.keyboard.press('Tab');
    const focusInsideDialog = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        return Boolean(dlg && dlg.contains(document.activeElement));
    });
    assert.equal(focusInsideDialog, true, 'auth-modal: keyboard focus must stay inside open dialog');

    // Escape key should close the modal cleanly (UX expectation)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const stillVisible = await dialog.isVisible().catch(() => false);
    assert.equal(stillVisible, false, 'auth-modal: pressing Escape should dismiss the dialog');

    report.checks.push({route: '/?auth=login', viewport: 'desktop', status: 'PASS', flow: 'keyboard-modal-ux'});
    console.log('PASS [ux     ] Auth modal keyboard focus & Escape dismissal');
    await context.close();
}

const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
        ? {executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH}
        : {}),
});

try {
    const context = await browser.newContext();
    const page = await context.newPage();
    attachObservers(page, 'responsive-a11y');

    for (const viewport of VIEWPORTS) {
        for (const route of PUBLIC_ROUTES) {
            await auditPageResponsiveAndA11y(page, route, viewport);
        }
    }
    await context.close();

    await auditAuthModalKeyboardAndValidationUx(browser);

    assert.deepEqual(report.pageErrors, [], `Uncaught page errors: ${JSON.stringify(report.pageErrors)}`);
    assert.deepEqual(report.serverErrors, [], `HTTP 5xx errors: ${JSON.stringify(report.serverErrors)}`);
    assert.deepEqual(report.consoleErrors, [], `Console errors: ${JSON.stringify(report.consoleErrors)}`);
} finally {
    await browser.close();
    if (OUTPUT_DIR) {
        await mkdir(OUTPUT_DIR, {recursive: true});
        await writeFile(
            path.join(OUTPUT_DIR, 'ui-ux-report.json'),
            JSON.stringify({...report, finishedAt: new Date().toISOString()}, null, 2),
        );
    }
}

console.log(`\nUI/UX Suite PASSED (${report.checks.length} checks).`);
