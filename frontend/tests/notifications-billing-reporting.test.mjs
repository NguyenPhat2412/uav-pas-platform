import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const atRoot = path => `${root}${path}`;
const customerVi = JSON.parse(readFileSync(atRoot('src/messages/customer/vi.json'), 'utf8'));
const adminVi = JSON.parse(readFileSync(atRoot('src/messages/sections/admin/vi.json'), 'utf8')).admin;
const backend = atRoot('../backend');

test('Database Flyway migrations V4, V5, V6, V7 exist and contain proper schemas', () => {
    const migrationsDir = `${backend}/src/main/resources/db/migration`;

    assert.equal(existsSync(`${migrationsDir}/V4__sar_and_ai_detection.sql`), true, 'V4 migration must exist');
    assert.equal(existsSync(`${migrationsDir}/V5__notifications.sql`), true, 'V5 migration must exist');
    assert.equal(existsSync(`${migrationsDir}/V6__billing_and_quotas.sql`), true, 'V6 migration must exist');
    assert.equal(existsSync(`${migrationsDir}/V7__system_configurations.sql`), true, 'V7 migration must exist');
    assert.equal(existsSync(`${migrationsDir}/V8__webhooks_and_telemetry_events.sql`), true, 'V8 migration must exist');

    const v4 = readFileSync(`${migrationsDir}/V4__sar_and_ai_detection.sql`, 'utf8');
    assert.match(v4, /CREATE TABLE (?:IF NOT EXISTS )?sar_missions/);
    assert.match(v4, /CREATE TABLE (?:IF NOT EXISTS )?ai_tasks/);
    assert.match(v4, /CREATE TABLE (?:IF NOT EXISTS )?ai_detections/);

    const v5 = readFileSync(`${migrationsDir}/V5__notifications.sql`, 'utf8');
    assert.match(v5, /CREATE TABLE (?:IF NOT EXISTS )?notifications/);

    const v6 = readFileSync(`${migrationsDir}/V6__billing_and_quotas.sql`, 'utf8');
    assert.match(v6, /CREATE TABLE (?:IF NOT EXISTS )?service_plans/);
    assert.match(v6, /CREATE TABLE (?:IF NOT EXISTS )?user_quotas/);
    assert.match(v6, /CREATE TABLE (?:IF NOT EXISTS )?invoices/);

    const v7 = readFileSync(`${migrationsDir}/V7__system_configurations.sql`, 'utf8');
    assert.match(v7, /CREATE TABLE (?:IF NOT EXISTS )?system_configurations/);
    assert.match(v7, /uav\.safety\.min_battery_threshold/);
    assert.match(v7, /ai\.detection\.confidence_threshold/);

    const v8 = readFileSync(`${migrationsDir}/V8__webhooks_and_telemetry_events.sql`, 'utf8');
    assert.match(v8, /CREATE TABLE (?:IF NOT EXISTS )?webhook_subscriptions/);
    assert.match(v8, /CREATE TABLE (?:IF NOT EXISTS )?webhook_delivery_logs/);
    assert.match(v8, /CREATE TABLE (?:IF NOT EXISTS )?payment_transactions/);
});

test('Operations App has NotificationBell and Notifications page', () => {
    const bellPath = `${root}src/components/notifications/NotificationBell.tsx`;
    const pagePath = `${root}src/features/notifications/components/OperationsNotificationsPanel.tsx`;
    const shellPath = `${root}src/components/layout/AppShell.tsx`;

    assert.equal(existsSync(bellPath), true, 'NotificationBell must exist');
    assert.equal(existsSync(pagePath), true, 'Notifications page must exist in operations');

    const bellContent = readFileSync(bellPath, 'utf8');
    assert.match(bellContent, /useNotifications/);
    const hook = readFileSync(atRoot('src/features/notifications/hooks/useNotifications.ts'), 'utf8');
    assert.match(hook, /API_ROUTES.notifications.unreadCount/);
    assert.match(hook, /NotificationItem/);

    const shellContent = readFileSync(shellPath, 'utf8');
    assert.match(shellContent, /NotificationBell/);
    assert.match(shellContent, /\/notifications/);
});

test('Customer Portal has Billing & Quotas and Notifications pages', () => {
    const billingPath = `${root}src/features/billing/components/CustomerBillingPanel.tsx`;
    const notifPath = `${root}src/features/notifications/components/CustomerNotificationsPanel.tsx`;
    const layoutPath = `${root}src/components/customer/layout.tsx`;

    assert.equal(existsSync(billingPath), true, 'Customer billing page must exist');
    assert.equal(existsSync(notifPath), true, 'Customer notifications page must exist');

    const billingContent = readFileSync(billingPath, 'utf8');
    assert.match(billingContent, /billingPage\.gatewayNotice/);
    assert.match(customerVi.billingPage.gatewayNotice, /Cổng thanh toán chưa được cấu hình/);
    assert.match(billingContent, /flightHoursUsed/);
    assert.match(billingContent, /flightHoursLimit/);
    assert.match(billingContent, /my-quota/);
    assert.match(billingContent, /my-invoices/);

    const notifContent = readFileSync(notifPath, 'utf8');
    assert.match(notifContent, /notificationsPage\.title/);
    assert.match(customerVi.notificationsPage.title, /Thông báo/);

    const layoutContent = readFileSync(layoutPath, 'utf8');
    assert.match(layoutContent, /\/billing/);
    assert.match(layoutContent, /\/notifications/);
});

test('Admin Portal has Billing Management, Reports & CSV Export, and Settings Configuration', () => {
    const billingPath = `${root}src/features/billing/components/AdminBillingPanel.tsx`;
    const reportsPath = `${root}src/features/reports/components/AdminReportsPanel.tsx`;
    const settingsPath = `${root}src/features/settings/components/AdminSettingsPanel.tsx`;
    const shellPath = `${root}src/components/layout/AdminAppShell.tsx`;

    assert.equal(existsSync(billingPath), true, 'Admin billing page must exist');
    assert.equal(existsSync(reportsPath), true, 'Admin reports page must exist');
    assert.equal(existsSync(settingsPath), true, 'Admin settings page must exist');

    const billingContent = readFileSync(billingPath, 'utf8');
    assert.match(billingContent, /admin\.pages\.billing\.title/);
    assert.match(adminVi.pages.billing.title, /Gói Cước/i);
    assert.match(billingContent, /User Quotas/i);
    assert.match(billingContent, /\/api\/v1\/billing/);

    const reportsContent = readFileSync(reportsPath, 'utf8');
    assert.match(reportsContent, /admin\.reports\.exportCsv/);
    assert.match(adminVi.reports.exportCsv, /Xuất Báo Cáo CSV/i);
    assert.match(reportsContent, /sarOperationsCount/);
    assert.match(reportsContent, /victimsRescued/);

    const settingsContent = readFileSync(settingsPath, 'utf8');
    assert.match(settingsContent, /admin\.settings\.safetyGroup/);
    assert.match(adminVi.settings.safetyGroup, /An toàn bay và giới hạn khu vực/i);
    assert.match(settingsContent, /KV260/i);
    assert.match(settingsContent, /admin\.settings\.intro/);
    assert.match(adminVi.settings.intro, /YOLOv8s/i);
    assert.match(adminVi.settings.intro, /KV260/i);

    const shellContent = readFileSync(shellPath, 'utf8');
    assert.match(shellContent, /\/billing/);
    assert.match(shellContent, /\/reports/);
    assert.match(shellContent, /\/settings/);
});

test('Centralized API_ROUTES registry in @/lib/api and Service-Layer delegation', () => {
    const routesPath = atRoot('src/lib/api/routes.ts');
    const indexClientPath = atRoot('src/lib/api/index.ts');
    assert.equal(existsSync(routesPath), true, 'API_ROUTES registry must exist in src/lib/api/routes.ts');

    const routesContent = readFileSync(routesPath, 'utf8');
    assert.match(routesContent, /export const API_ROUTES = \{/);
    assert.match(routesContent, /\/api\/v1\/billing\/webhook\/payment-ipn/);
    assert.match(routesContent, /\/api\/v1\/reports\/operations-summary/);
    assert.match(routesContent, /\/api\/v1\/settings/);
    assert.match(routesContent, /\/api\/v1\/webhooks/);
    assert.match(routesContent, /\/api\/v1\/notifications\/unread-count/);

    const indexContent = readFileSync(indexClientPath, 'utf8');
    assert.match(indexContent, /export \{ API_ROUTES, type ApiRoutes \} from ['"]@\/lib\/api\/routes['"]/);

    const customerBillingContent = readFileSync(`${root}src/features/billing/components/CustomerBillingPanel.tsx`, 'utf8');
    assert.doesNotMatch(customerBillingContent, /fetch\(['"`]\/api\/v1\//);
    assert.doesNotMatch(customerBillingContent, /simulatePaymentIpn|Xác nhận thủ công|101869876543/);
    assert.match(customerBillingContent, /billingPage\.gatewayNotice/);

    const adminReportsContent = readFileSync(`${root}src/features/reports/components/AdminReportsPanel.tsx`, 'utf8');
    assert.match(adminReportsContent, /adminService\.operationsReport/);

    const adminSettingsContent = readFileSync(`${root}src/features/settings/components/AdminSettingsPanel.tsx`, 'utf8');
    assert.match(adminSettingsContent, /adminService\.settings/);
    assert.match(adminSettingsContent, /adminService\.updateSetting/);
});


test('Notifications adapt actual backend DTOs and preserve HTTP and user-cache contracts', async () => {
    const ts = await import('typescript');
    const routesSource = readFileSync(atRoot('src/lib/api/routes.ts'), 'utf8');
    const compile = source => ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    const {API_ROUTES} = await import('data:text/javascript;base64,' + Buffer.from(compile(routesSource)).toString('base64'));
    const queries = [], calls = [], invalidations = [];
    let mutation;
    const response = {
        id: 17,
        title: 'Phân công',
        content: 'Nhiệm vụ kiểm thử đã được giao.',
        type: 'MISSION_ASSIGNED',
        isRead: false,
        createdAt: '2026-10-16T09:00:00'
    };
    globalThis.__notificationTest = {
        useAuth: () => ({user: {id: 42}}),
        useI18n: () => ({t: key => key}),
        useQuery: config => {
            queries.push(config);
            return {data: undefined, isPending: true};
        },
        useQueryClient: () => ({invalidateQueries: args => invalidations.push(args)}),
        useMutation: config => {
            mutation = config;
            return {
                isPending: false, error: null, reset() {
                }, mutate() {
                }
            };
        },
        API_ROUTES,
        apiClient: Object.fromEntries(['get', 'post', 'patch'].map(method => [method, async (url, options) => {
            calls.push({method, url, options});
            return url.includes('unread-count') ? {unreadCount: 1} : {content: [response]};
        }])),
    };
    try {
        const source = readFileSync(atRoot('src/features/notifications/hooks/useNotifications.ts'), 'utf8')
            .replace(/^import .*;$/gm, '') + '\n';
        const notificationModule = await import('data:text/javascript;base64,' + Buffer.from(compile('const {useAuth,useI18n,useQuery,useQueryClient,useMutation,apiClient,API_ROUTES}=globalThis.__notificationTest;\n' + source)).toString('base64'));
        const state = notificationModule.useNotifications();
        assert.deepEqual(state.notifications, [], 'no synthetic notifications while loading');
        const items = await queries[0].queryFn({signal: undefined});
        assert.equal(items[0].message, response.content);
        assert.equal(items[0].id, '17');
        assert.equal(items[0].isRead, false);
        assert.equal(items[0].type, 'INFO');
        assert.equal(notificationModule.toNotificationItem({...response, type: 'SAR_TARGET_FOUND'}).type, 'ALERT');
        assert.equal(notificationModule.toNotificationItem({...response, type: 'QUOTA_WARNING'}).type, 'WARNING');
        assert.equal((await queries[1].queryFn({signal: undefined})).unreadCount, 1);
        await mutation.mutationFn('17');
        await mutation.mutationFn(null);
        assert.deepEqual(calls.slice(-2).map(({method, url}) => ({method, url})), [
            {method: 'patch', url: '/api/v1/notifications/17/read'},
            {method: 'post', url: '/api/v1/notifications/read-all'},
        ]);
        await mutation.onSuccess();
        assert.deepEqual(invalidations[0].queryKey, ['session', 42, 'notifications']);
        assert.ok(queries.every(q => q.enabled && q.queryKey[1] === 42));
    } finally {
        delete globalThis.__notificationTest;
    }
});
