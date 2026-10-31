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
    const bellPath = `${root}src/components/notification/NotificationBell.tsx`;
    const pagePath = `${root}src/components/notification/OperationsNotificationsPanel.tsx`;
    const shellPath = `${root}src/components/layout/AppShell.tsx`;

    assert.equal(existsSync(bellPath), true, 'NotificationBell must exist');
    assert.equal(existsSync(pagePath), true, 'Notifications page must exist in operations');

    const bellContent = readFileSync(bellPath, 'utf8');
    assert.match(bellContent, /useNotifications/);
    const hook = readFileSync(atRoot('src/hooks/notification/useNotifications.ts'), 'utf8');
    assert.match(hook, /notificationsService\.unreadCount/);
    assert.match(readFileSync(atRoot('src/api/notification/notifications.api.ts'), 'utf8'), /API_ROUTES.notifications.unreadCount/);
    assert.match(hook, /NotificationItem/);

    const shellContent = readFileSync(shellPath, 'utf8');
    assert.match(shellContent, /NotificationBell/);
    assert.match(shellContent, /\/notifications/);
});

test('Customer Portal has Billing & Quotas and Notifications pages', () => {
    const billingPath = `${root}src/components/billing/CustomerBillingPanel.tsx`;
    const notifPath = `${root}src/components/notification/CustomerNotificationsPanel.tsx`;
    const layoutPath = `${root}src/components/customer/CustomerLayout.tsx`;

    assert.equal(existsSync(billingPath), true, 'Customer billing page must exist');
    assert.equal(existsSync(notifPath), true, 'Customer notifications page must exist');

    const billingContent = readFileSync(billingPath, 'utf8');
    assert.match(billingContent, /useSubscribePlan|useBankTransferStatus/, 'payments go through the billing hooks');
    assert.match(readFileSync(`${root}src/hooks/billing/useCustomerBilling.ts`, 'utf8'), /bankTransferService/, 'the hooks use the VietQR bank-transfer API');
    assert.match(billingContent, /payment\.awaitingTransferHint/);
    assert.equal(customerVi.billingPage.gatewayNotice, undefined, 'no "gateway not configured" copy');
    assert.equal(customerVi.billingPage.subtitle, undefined, 'customer pages carry no title/description block');
    assert.doesNotMatch(billingContent, /billingPage\.(title|subtitle)/);
    assert.match(billingContent, /flightHoursUsed/);
    assert.match(billingContent, /flightHoursLimit/);
    assert.match(billingContent, /my-quota/);
    assert.match(billingContent, /my-invoices/);

    const notifContent = readFileSync(notifPath, 'utf8');
    assert.doesNotMatch(notifContent, /notificationsPage\.(title|subtitle)/, 'no page title block');
    assert.match(notifContent, /notificationsPage\.all/);

    const layoutContent = readFileSync(layoutPath, 'utf8');
    assert.match(layoutContent, /\/billing/);
    assert.match(layoutContent, /\/notifications/);
});

test('Admin Portal has Billing Management, Reports & CSV Export, and Settings Configuration', () => {
    const billingPath = `${root}src/components/billing/AdminBillingPanel.tsx`;
    const reportsPath = `${root}src/components/reporting/AdminReportsPanel.tsx`;
    const settingsPath = `${root}src/components/settings/AdminSettingsPanel.tsx`;
    const shellPath = `${root}src/components/layout/AdminAppShell.tsx`;

    assert.equal(existsSync(billingPath), true, 'Admin billing page must exist');
    assert.equal(existsSync(reportsPath), true, 'Admin reports page must exist');
    assert.equal(existsSync(settingsPath), true, 'Admin settings page must exist');

    const billingContent = readFileSync(billingPath, 'utf8');
    assert.match(billingContent, /admin\.pages\.billing\.title/);
    assert.match(adminVi.pages.billing.title, /Gói Cước/i);
    assert.match(billingContent, /User Quotas/i);
    // The page reaches the billing API through the billing hooks and quota service, not a hard-coded path.
    assert.match(billingContent, /useBillingPlans\(\)/);
    assert.match(readFileSync(`${root}src/hooks/billing/useBillingAdmin.ts`, 'utf8'), /quotasService\.billing(Plans|Quotas)/);

    const reportsContent = readFileSync(reportsPath, 'utf8');
    assert.match(reportsContent, /admin\.reports\.exportCsv/);
    assert.match(adminVi.reports.exportCsv, /Xuất Báo Cáo CSV/i);
    assert.match(reportsContent, /sarOperationsCount/);
    assert.match(reportsContent, /victimsRescued/);

    const settingsContent = readFileSync(settingsPath, 'utf8');
    assert.match(settingsContent, /admin\.settings\.safetyGroup/);
    assert.match(adminVi.settings.safetyGroup, /An toàn bay và giới hạn khu vực/i);
    assert.match(settingsContent, /KV260/i);
    assert.doesNotMatch(settingsContent, /admin\.settings\.(heading|intro)/, 'admin pages carry no title/description block');
    assert.match(JSON.stringify(adminVi.settings), /KV260/i);

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

    const customerBillingContent = readFileSync(`${root}src/components/billing/CustomerBillingPanel.tsx`, 'utf8');
    assert.doesNotMatch(customerBillingContent, /fetch\(['"`]\/api\/v1\//);
    assert.doesNotMatch(customerBillingContent, /simulatePaymentIpn|Xác nhận thủ công|101869876543/);
    assert.doesNotMatch(customerBillingContent, /billingPage\.(gatewayNotice|upgradeUnavailable)/);

    const adminReportsContent = readFileSync(`${root}src/components/reporting/AdminReportsPanel.tsx`, 'utf8');
    assert.match(adminReportsContent, /useOperationsReport\(\)/);
    assert.match(readFileSync(`${root}src/hooks/reporting/useReports.ts`, 'utf8'), /reportsService\.operationsReport/);

    const adminSettingsContent = readFileSync(`${root}src/components/settings/AdminSettingsPanel.tsx`, 'utf8');
    assert.match(adminSettingsContent, /usePlatformSettings\(\)/);
    assert.match(adminSettingsContent, /useSaveSetting\(\)/);
    const settingsHooks = readFileSync(`${root}src/hooks/settings/useSettings.ts`, 'utf8');
    assert.match(settingsHooks, /platformSettingsService\.list/);
    assert.match(settingsHooks, /platformSettingsService\.update/);
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
        // The real query keys and notification service, wired to the recording client above.
        const strip = file => readFileSync(atRoot(file), 'utf8').replace(/^import .*;$/gm, '') + '\n';
        const load = source => import('data:text/javascript;base64,' + Buffer.from(compile(source)).toString('base64'));
        globalThis.__notificationTest.queryKeys = (await load(strip('src/lib/query/index.ts'))).queryKeys;
        globalThis.__notificationTest.buildQueryString = (await load(strip('src/lib/format.ts').replace(/^export type .*$/gm, ''))).buildQueryString;
        globalThis.__notificationTest.notificationsService = (await load('const {apiClient,API_ROUTES,buildQueryString}=globalThis.__notificationTest;\n'
            + strip('src/api/notification/notifications.api.ts'))).notificationsService;
        const notificationModule = await load('const {useAuth,useI18n,useQuery,useQueryClient,useMutation,queryKeys,notificationsService,usersService}=globalThis.__notificationTest;\n'
            + strip('src/hooks/notification/useNotifications.ts'));
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
