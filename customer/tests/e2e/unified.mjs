import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const base = process.env.UAV_UI_URL || 'http://localhost:3100';
const output = process.env.UAV_UI_OUTPUT;
if (output) await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
const checks = [], pageErrors = [], serverErrors = [], consoleIssues = [], businessWrites = [];
const publicRoutes = ['/', '/about', '/services', '/solutions', '/how-it-works', '/pricing', '/contact', '/faq', '/privacy', '/terms',
    ...['uav-rental', 'aerial-inspection', 'aerial-recording', 'data-collection'].map(slug => '/services/' + slug),
    ...['managed-uav-operations', 'infrastructure-inspection', 'ai-detection', 'search-and-rescue'].map(slug => '/solutions/' + slug)];
const portalRoutes = {
    admin: ['dashboard', 'users', 'access-control', 'role-templates', 'permissions', 'audit-logs', 'billing', 'reports', 'settings', 'webhooks'],
    operations: ['overview', 'stations', 'uavs', 'inventory', 'media', 'audit', 'dispatch/missions', 'assigned-missions', 'maintenance', 'notifications', 'sar-cockpit'],
    customer: ['dashboard', 'services', 'missions', 'missions/create', 'billing', 'notifications', 'profile'],
};

function observe(page) {
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(20000);
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/v1/') && !url.pathname.startsWith('/api/v1/auth/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) businessWrites.push({
            path: url.pathname,
            method: request.method()
        });
    });
    page.on('console', message => {
        if (!['error', 'warning'].includes(message.type())) return;
        const location = message.location().url;
        const pathname = location?.startsWith('http') ? new URL(location).pathname : '';
        if (/\/auth\/(me|refresh)$/.test(pathname) && /(?:400|401)/.test(message.text())) return;
        consoleIssues.push({
            route: new URL(page.url()).pathname,
            type: message.type(),
            message: message.text(),
            path: pathname
        });
    });
    page.on('pageerror', error => pageErrors.push({route: new URL(page.url()).pathname, message: error.message}));
    page.on('response', response => {
        if (response.status() >= 500 || (response.status() === 404 && new URL(response.url()).pathname.startsWith('/_next/'))) {
            serverErrors.push({path: new URL(response.url()).pathname, status: response.status()});
        }
    });
}

async function rendered(page, route, width) {
    assert.ok((await page.title()).includes('UAV PAS'), route + ': title');
    assert.ok((await page.locator('body').innerText()).trim().length > 40, route + ': meaningful content');
    assert.equal(await page.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, route + ': overflow');
    const broken = await page.locator('img').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.getAttribute('src')));
    assert.deepEqual(broken, [], route + ': image delivery');
    checks.push({route, width, status: 'PASS'});
    console.log('PASS', width, route);
}

async function screenshot(page, name) {
    if (output) await page.screenshot({path: path.join(output, name + '.png'), fullPage: false});
}

try {
    for (const width of [1440, 390, 320]) {
        const context = await browser.newContext({viewport: {width, height: 900}});
        const page = await context.newPage();
        observe(page);
        for (const route of publicRoutes) {
            const response = await page.goto(base + route);
            assert.equal(response.status(), 200, route);
            await page.locator('main h1').waitFor();
            await rendered(page, route, width);
        }
        await page.goto(base + '/');
        if (width < 1280) {
            const trigger = page.locator('.menu-button');
            await trigger.click();
            assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
            await page.keyboard.press('Escape');
            assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        }
        await screenshot(page, 'public-' + width);
        if (width < 1280) await page.locator('.menu-button').click();
        await page.locator('.nav-login').click();
        const loginDialog = page.locator('[role="dialog"]');
        await loginDialog.waitFor();
        await loginDialog.getByRole('button', {name: /Đăng nhập bằng email/}).click();
        await loginDialog.locator('#auth-login-password').waitFor();
        await rendered(page, '/?auth=login', width);
        await screenshot(page, 'login-' + width);
        for (const [area, route] of [['customer', 'missions'], ['operations', 'stations'], ['admin', 'users']]) {
            await page.goto(`${base}/${area}/${route}`);
            await page.waitForURL(u => u.searchParams.get('auth') === 'login');
            await page.locator('[role="dialog"]').waitFor();
            await rendered(page, `/?auth=login&next=/${area}/${route}`, width);
        }
        for (const route of ['/?auth=login', '/?auth=register', '/customer/login', '/operations/login', '/admin/login']) {
            await page.goto(base + route);
            const dialog = page.locator('[role="dialog"]');
            await dialog.waitFor();
            const isRegister = route.includes('register');
            const expandBtn = dialog.getByRole('button', {name: isRegister ? /Đăng ký bằng email/ : /Đăng nhập bằng email/});
            if (await expandBtn.count()) await expandBtn.click();
            const password = dialog.locator(isRegister ? '#auth-reg-password' : '#auth-login-password');
            await password.waitFor();
            await password.fill('Visibility-check-42');
            assert.equal(await password.getAttribute('type'), 'password');
            const toggle = dialog.getByRole('button', {name: /Hiện mật khẩu|Ẩn mật khẩu/}).first();
            await toggle.click();
            assert.equal(await password.getAttribute('type'), 'text');
            assert.equal(await password.inputValue(), 'Visibility-check-42');
            await toggle.click();
            assert.equal(await password.getAttribute('type'), 'password');
            await rendered(page, route + ' (eye toggle)', width);
            if (isRegister) await screenshot(page, 'register-' + width);
        }
        await context.close();
    }
    // Only test fixtures are intercepted. Production source has no demo auth switch.
    for (const [area, route, forbiddenEndpoint] of [['admin', 'users', '/users'], ['operations', 'stations', '/stations'], ['customer', 'missions', '/missions']]) {
        const context = await browser.newContext();
        const requests = [];
        await context.route('**/api/v1/**', async route => {
            const url = new URL(route.request().url());
            requests.push(url.pathname);
            const body = url.pathname.endsWith('/auth/me') || url.pathname.endsWith('/users/me')
                ? {id: 999, username: 'permission-check', status: 'ACTIVE'}
                : url.pathname.endsWith('/permissions/me') ? [] : {content: [], totalElements: 0, unreadCount: 0};
            await route.fulfill({json: body});
        });
        const page = await context.newPage();
        observe(page);
        await page.goto(`${base}/${area}/${route}`);
        await page.getByText(/Không có quyền truy cập|Bạn không có quyền|Tài khoản chưa được cấp quyền/).first().waitFor();
        assert.ok(!requests.some(endpoint => endpoint === '/api/v1' + forbiddenEndpoint), area + ': no forbidden data request');
        assert.equal(await page.locator(`nav a[href="/${area}/${route}"]`).count(), 0, area + ': hidden menu item');
        checks.push({route: `/${area}/${route}`, state: 'permission-denied', status: 'PASS'});
        await context.close();
    }
    // Optional live accounts: login and read screens only. Never submit business forms.
    if (process.env.UAV_UI_ACCOUNTS) {
        const accounts = JSON.parse(await readFile(process.env.UAV_UI_ACCOUNTS, 'utf8'));
        for (const [area, routes] of Object.entries(portalRoutes)) {
            const context = await browser.newContext();
            const page = await context.newPage();
            observe(page);
            await page.goto(`${base}/?auth=login&next=/${area}/${routes[0]}`);
            const dialog = page.locator('[role="dialog"]');
            await dialog.waitFor();
            const expand = dialog.getByRole('button', {name: /Đăng nhập bằng email/});
            if (await expand.count()) await expand.click();
            await dialog.locator('#auth-login-user').fill(accounts[area].username);
            await dialog.locator('#auth-login-password').fill(accounts[area].password);
            await dialog.locator('button[type="submit"]').click();
            await page.waitForURL(url => !url.pathname.endsWith('/login') && !url.searchParams.has('auth'));
            for (const width of [1440, 390, 320]) {
                await page.setViewportSize({width, height: 900});
                for (const route of routes) {
                    const plansLoaded = route === 'billing' ? page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/billing/plans' && response.status() === 200) : null;
                    const permissionsLoaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/permissions/me' && response.status() === 200);
                    await page.goto(`${base}/${area}/${route}`);
                    await permissionsLoaded;
                    await page.waitForFunction(() => !document.querySelector('[aria-label="Đang tải dữ liệu"]'));
                    await page.locator('h1').first().waitFor();
                    await rendered(page, `/${area}/${route}`, width);
                    assert.deepEqual((await page.getByRole('alert').allTextContents()).map(text => text.trim()).filter(Boolean), [], area + '/' + route + ': no data error');
                    if (plansLoaded) {
                        const plans = await (await plansLoaded).json();
                        for (const plan of plans) {
                            const card = page.locator('article').filter({has: page.getByText(plan.code, {exact: true})});
                            await card.waitFor();
                            assert.ok((await card.innerText()).includes(plan.price.toLocaleString('vi-VN') + ' đ'), 'Plan price must match the API');
                            assert.equal(await card.getByText('Gói nổi bật', {exact: true}).count(), plan.active && plan.code === 'PRO' ? 1 : 0);
                        }
                        const emptyInvoices = page.getByText('Chưa có hóa đơn nào.', {exact: true});
                        if (area === 'customer' && await emptyInvoices.count()) {
                            const bounds = await emptyInvoices.boundingBox();
                            assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'Empty invoice message stays within the viewport');
                        }
                        checks.push({route: `/${area}/${route}`, width, state: 'API-plan-prices', status: 'PASS'});
                    }
                    if (route === routes[0]) await screenshot(page, area + '-' + width);
                }
                await page.goto(`${base}/${area}/${routes[0]}`);
                if (width < 1024) {
                    const trigger = page.getByRole('button', {name: /Mở điều hướng|Mở trình đơn/});
                    await trigger.click();
                    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
                    await page.keyboard.press('Escape');
                    await page.waitForFunction(() => document.body.style.overflow !== 'hidden');
                }
            }
            if (area === 'customer') {
                let forbiddenRequests = 0;
                page.on('request', request => {
                    if (new URL(request.url()).pathname === '/api/v1/users') forbiddenRequests++;
                });
                await page.goto(base + '/admin/users');
                await page.getByText('Không có quyền truy cập', {exact: true}).waitFor();
                assert.equal(forbiddenRequests, 0, 'Customer cannot fetch admin user data');
                checks.push({route: '/admin/users', state: 'live-customer-denied', status: 'PASS'});
                await page.goto(base + '/customer/profile');
                await page.locator('h1').first().waitFor();
                assert.ok(new URL(page.url()).pathname === '/customer/profile', 'Own profile remains available after denied navigation');
            }
            await context.close();
        }
        if (accounts.operator) {
            const context = await browser.newContext();
            const page = await context.newPage();
            observe(page);
            await page.goto(base + '/?auth=login&next=/operations/assigned-missions');
            const opDialog = page.locator('[role="dialog"]');
            await opDialog.waitFor();
            const opExpand = opDialog.getByRole('button', {name: /Đăng nhập bằng email/});
            if (await opExpand.count()) await opExpand.click();
            await opDialog.locator('#auth-login-user').fill(accounts.operator.username);
            await opDialog.locator('#auth-login-password').fill(accounts.operator.password);
            await opDialog.locator('button[type="submit"]').click();
            await page.waitForURL(url => !url.pathname.endsWith('/login') && !url.searchParams.has('auth'));
            for (const width of [1440, 390, 320]) {
                await page.setViewportSize({width, height: 900});
                await page.goto(base + '/operations/assigned-missions');
                await page.getByRole('heading', {name: 'Nhiệm vụ được giao', exact: true}).first().waitFor();
                await rendered(page, '/operations/assigned-missions (operator)', width);
                await page.goto(base + '/operations/dispatch/missions');
                await page.getByText('Không có quyền truy cập', {exact: true}).waitFor();
                assert.equal(await page.locator('nav a[href="/operations/dispatch/missions"]').count(), 0);
                checks.push({
                    route: '/operations/dispatch/missions',
                    width,
                    state: 'live-operator-denied',
                    status: 'PASS'
                });
            }
            await context.close();
        }
    }
    assert.deepEqual(businessWrites, []);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(serverErrors, []);
    assert.deepEqual(consoleIssues.filter(issue => issue.type === 'error'), []);
    console.log(JSON.stringify({status: 'PASS', checks: checks.length, livePortals: !!process.env.UAV_UI_ACCOUNTS}));
} finally {
    if (output) await writeFile(path.join(output, 'checks.json'), JSON.stringify({
        checks,
        pageErrors,
        serverErrors,
        consoleIssues,
        businessWrites
    }, null, 2));
    await browser.close();
}
