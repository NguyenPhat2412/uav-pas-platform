import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = rel => readFileSync(`${root}${rel}`, 'utf8');

test('S3 operations marketplace routes exist for onboarding, fleet, pilots, listings, orders, simulation, and wallet', () => {
    for (const rel of [
        'src/app/(operations)/operations/(portal)/provider/onboarding/page.tsx',
        'src/app/(operations)/operations/(portal)/provider/fleet/page.tsx',
        'src/app/(operations)/operations/(portal)/provider/pilots/page.tsx',
        'src/app/(operations)/operations/(portal)/provider/listings/page.tsx',
        'src/app/(operations)/operations/(portal)/provider/orders/page.tsx',
        'src/app/(operations)/operations/(portal)/provider/orders/[missionId]/simulation/page.tsx',
        'src/app/(operations)/operations/(portal)/provider/wallet/page.tsx',
    ]) {
        assert.equal(existsSync(`${root}${rel}`), true, `${rel} should exist`);
    }
});

test('S3 marketplace API boundary uses CONTRACT.md provider endpoints through shared apiClient', () => {
    const routes = read('src/lib/api/routes.ts');
    for (const expected of [
        '/api/v1/marketplace/provider/me',
        '/api/v1/marketplace/provider/documents',
        '/api/v1/marketplace/provider/listings',
        '/api/v1/marketplace/provider/listings/from-template',
        '/api/v1/marketplace/provider/fleet/uavs',
        '/api/v1/marketplace/provider/pilots',
        '/api/v1/marketplace/provider/orders',
        '/api/v1/marketplace/provider/wallet',
    ]) {
        assert.match(routes, new RegExp(expected.replaceAll('/', '\\/')), expected);
    }

    const api = read('src/api/marketplace.api.ts');
    assert.match(api, /API_ROUTES\.marketplace\.providerMe/);
    assert.match(api, /API_ROUTES\.marketplace\.providerListingsFromTemplate/);
    assert.match(api, /API_ROUTES\.marketplace\.providerFleetUavs/);
    assert.match(api, /API_ROUTES\.marketplace\.providerPilots/);
    assert.match(api, /API_ROUTES\.marketplace\.providerOrderAssign/);
    assert.match(api, /API_ROUTES\.marketplace\.providerOrderStart/);
    assert.match(api, /API_ROUTES\.marketplace\.providerOrderComplete/);
    assert.doesNotMatch(api, /\bfetch\s*\(/);
});

test('S3 wallet view is read-only and displays illustrative badges + footer note without withdrawal mutations', () => {
    const walletView = read('src/components/marketplace/provider/ProviderWalletView.tsx');
    assert.match(walletView, /IllustrativeBadge/);
    assert.match(walletView, /IllustrativeFooterNote/);
    assert.match(walletView, /opsMarketplace\.wallet\.readOnlyNotice/);
    assert.doesNotMatch(walletView, /useRequestPayout|requestPayout/);
});

test('S3 opsMarketplace i18n catalog has identical keys across vi, en, and ja', () => {
    const keys = (o, prefix = '') =>
        Object.entries(o)
            .flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]))
            .sort();
    const [vi, en, ja] = ['vi', 'en', 'ja'].map(l =>
        JSON.parse(read(`src/messages/sections/opsMarketplace/${l}.json`)),
    );
    assert.deepEqual(keys(en), keys(vi));
    assert.deepEqual(keys(ja), keys(vi));
});

test('S3 opsMarketplace catalogs and provider components obey content-guard rules', () => {
    const banned = [
        /\bVJU\b|Việt Nhật|Viet Nhat|Vietnam[ -]Japan|日越|ĐHQG|ĐHQGHN|\bVNU\b/i,
        /tác chiến|chiến đấu|sĩ quan|chiến thuật|\btactical\b|\bcombat\b|作戦|戦闘/i,
        /\(\s*(minh hoạ|minh họa|mô phỏng|giả lập)\s*\)/i,
        /hóa đơn VAT|hoá đơn VAT|bao gồm VAT/i,
    ];
    for (const rel of [
        'src/messages/sections/opsMarketplace/vi.json',
        'src/messages/sections/opsMarketplace/en.json',
        'src/messages/sections/opsMarketplace/ja.json',
        'src/components/marketplace/provider/ProviderStudioShell.tsx',
        'src/components/marketplace/provider/ProviderOnboardingView.tsx',
        'src/components/marketplace/provider/ProviderFleetView.tsx',
        'src/components/marketplace/provider/ProviderPilotsView.tsx',
        'src/components/marketplace/provider/ProviderListingsView.tsx',
        'src/components/marketplace/provider/ProviderOrdersView.tsx',
        'src/components/marketplace/provider/ProviderWalletView.tsx',
        'src/components/dashboard/OperationsOverviewPanel.tsx',
    ]) {
        const text = read(rel);
        for (const pattern of banned) {
            assert.doesNotMatch(text, pattern, `${rel} must not match ${pattern}`);
        }
    }
});

test('S3 marketplace form helpers classify order tabs, UAV/pilot status cards, and illustrative VND prices accurately', async () => {
    const {
        classifySellerOrderTab,
        normalizeUavStatusCardKey,
        formatVndCompact,
        extractActionableError,
        formatProviderConflictError,
        inferMissionTypeFromServiceCode,
        listingFormFromTemplate,
        sanitizeEntityName,
        sanitizeMarketplaceText,
    } = await import('../src/forms/marketplace-forms.ts');

    assert.equal(
        sanitizeMarketplaceText('Khảo sát RTK (minh hoạ)'),
        'Khảo sát GNSS',
    );
    assert.equal(
        sanitizeEntityName('Ghi hình trên không 4K — minh hoạ'),
        'Ghi hình trên không 4K',
    );
    assert.equal(
        sanitizeEntityName('Đội bay Miền Bắc – minh họa'),
        'Đội bay Miền Bắc',
    );

    const mockVi = JSON.parse(read('src/messages/sections/opsMarketplace/vi.json'));
    const lookupVi = key =>
        key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), mockVi) ?? key;

    for (const code of [
        'UAV_TIME_CONFLICT',
        'OPERATOR_TIME_CONFLICT',
        'UAV_IN_USE',
        'NO_UAV_AVAILABLE',
    ]) {
        const msg = formatProviderConflictError({code, message: 'HTTP 409'}, lookupVi);
        assert.equal(msg, lookupVi(`opsMarketplace.orders.conflicts.${code}`));
        assert.ok(msg.length > 10);
    }

    assert.equal(
        classifySellerOrderTab({id: 1, status: 'CONFIRMED', providerResponseStatus: 'PENDING_PROVIDER'}),
        'PENDING_ACCEPT',
    );
    assert.equal(
        classifySellerOrderTab({id: 2, status: 'PENDING_CONFIRMATION', providerResponseStatus: null}),
        'PENDING_ACCEPT',
    );
    assert.equal(
        classifySellerOrderTab({id: 3, status: 'READY', providerResponseStatus: 'ACCEPTED'}),
        'WAITING_FLIGHT',
    );
    assert.equal(
        classifySellerOrderTab({id: 4, status: 'IN_PROGRESS', providerResponseStatus: 'ACCEPTED'}),
        'IN_FLIGHT',
    );
    assert.equal(
        classifySellerOrderTab({id: 5, status: 'COMPLETED', providerResponseStatus: 'ACCEPTED'}),
        'DELIVERED',
    );
    assert.equal(
        classifySellerOrderTab({id: 6, status: 'CONFIRMED', providerResponseStatus: 'DECLINED'}),
        'DELIVERED',
    );

    assert.equal(normalizeUavStatusCardKey('AVAILABLE'), 'READY');
    assert.equal(normalizeUavStatusCardKey('IN_USE'), 'FLYING');
    assert.equal(normalizeUavStatusCardKey('IN_FLIGHT'), 'FLYING');
    assert.equal(normalizeUavStatusCardKey('MAINTENANCE'), 'MAINTENANCE');
    assert.equal(normalizeUavStatusCardKey('OFF_DUTY'), 'MAINTENANCE');

    assert.match(formatVndCompact(1500000), /1\.500\.000\s*₫/);
    assert.equal(formatVndCompact(null), '0 ₫');

    assert.equal(
        extractActionableError({fields: {province: 'Thiếu tỉnh', title: 'Thiếu tên'}}, 'fallback'),
        'Thiếu tỉnh · Thiếu tên',
    );
    assert.equal(inferMissionTypeFromServiceCode('LIDAR_DATA_SURVEY'), 'DATA_COLLECTION');
    assert.equal(inferMissionTypeFromServiceCode('AERIAL_VIDEO_4K'), 'AERIAL_RECORDING');

    const tplForm = listingFormFromTemplate(
        {
            id: 9,
            code: 'LIDAR_MAP',
            name: 'Khảo sát bản đồ 3D',
            description: 'Bàn giao đám mây điểm',
            active: true,
            defaultDurationMinutes: 60,
            sensors: ['LiDAR', 'RGB'],
            deliveryHours: 36,
        },
        'Đà Nẵng',
        120,
    );
    assert.equal(tplForm.categoryServiceId, 9);
    assert.equal(tplForm.province, 'Đà Nẵng');
    assert.equal(tplForm.serviceRadiusKm, 120);
    assert.equal(tplForm.deliverySlaHours, 36);
});

test('S3 control engineer today workspace wires preflight checklist, simulation launch, and deliverable upload', () => {
    const pilotWorkspace = read('src/components/mission/operations/PilotTodayWorkspace.tsx');
    const assignedPanel = read('src/components/mission/operations/AssignedMissionsPanel.tsx');
    const marketplaceHooks = read('src/hooks/useMarketplace.ts');
    assert.match(assignedPanel, /PilotTodayWorkspace/);
    assert.match(pilotWorkspace, /MissionPreflightCard/);
    assert.match(pilotWorkspace, /\/operations\/simulation\?missionId=/);
    assert.match(pilotWorkspace, /usePilotTodayActions/);
    assert.match(marketplaceHooks, /requestMediaUpload/);
    assert.match(marketplaceHooks, /confirmMedia/);
});

test('S3 every static opsMarketplace.* translation key used in components exists in vi, en, and ja', () => {
    const [vi, en, ja] = ['vi', 'en', 'ja'].map(l =>
        JSON.parse(read(`src/messages/sections/opsMarketplace/${l}.json`)),
    );
    const lookup = (obj, path) =>
        path.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), obj);

    const componentFiles = [
        'src/components/marketplace/provider/IllustrativeDisclaimer.tsx',
        'src/components/marketplace/provider/ProviderUavSelectField.tsx',
        'src/components/marketplace/provider/ProviderStudioShell.tsx',
        'src/components/marketplace/provider/ProviderOnboardingView.tsx',
        'src/components/marketplace/provider/ProviderFleetView.tsx',
        'src/components/marketplace/provider/ProviderPilotsView.tsx',
        'src/components/marketplace/provider/ProviderListingsView.tsx',
        'src/components/marketplace/provider/ProviderOrdersView.tsx',
        'src/components/marketplace/provider/ProviderWalletView.tsx',
        'src/components/mission/operations/PilotTodayWorkspace.tsx',
        'src/components/dashboard/OperationsOverviewPanel.tsx',
        'src/components/simulation/SimulationConsole.tsx',
        'src/components/shared/UnifiedFloatingLauncher.tsx',
    ];

    for (const file of componentFiles) {
        const src = read(file);
        for (const match of src.matchAll(/t\('(opsMarketplace\.[a-zA-Z0-9_.]+)'/g)) {
            const key = match[1];
            assert.equal(typeof lookup(vi, key), 'string', `Missing vi key ${key} in ${file}`);
            assert.equal(typeof lookup(en, key), 'string', `Missing en key ${key} in ${file}`);
            assert.equal(typeof lookup(ja, key), 'string', `Missing ja key ${key} in ${file}`);
        }
    }
});

test('S3 responsive toast, notification popup, table headers, and localized template badges prevent 390px overflow and raw enum leak', () => {
    const toastSrc = read('src/components/ui/Toast.tsx');
    assert.match(toastSrc, /left-4\s+right-4/);
    assert.match(toastSrc, /max-w-\[calc\(100vw-2rem\)\]/);
    assert.doesNotMatch(toastSrc, /<h4[^>]*truncate/);

    const popupSrc = read('src/components/notification/popup/LiveNotificationPopupHost.tsx');
    assert.match(popupSrc, /left-4\s+right-4/);
    assert.match(popupSrc, /max-w-\[calc\(100vw-2rem\)\]/);

    const listingsSrc = read('src/components/marketplace/provider/ProviderListingsView.tsx');
    assert.match(listingsSrc, /displayLabel\(tpl\.code\)/);
    assert.match(listingsSrc, /serviceName\(tpl\)/);

    const dataTableSrc = read('src/components/data/DataTable.tsx');
    assert.match(dataTableSrc, /px-4 py-3 whitespace-nowrap/);
});

test('S3 unified floating launcher, 2-line UAV combobox, outline disabled-when-unchanged save assignment, and single footer note are wired', () => {
    const shellSrc = read('src/components/layout/AppShell.tsx');
    assert.match(shellSrc, /UnifiedFloatingLauncher/);
    assert.match(shellSrc, /OperationsSupportQuickDock\s+hideLauncher/);
    assert.match(shellSrc, /AssistantWidget\s+portal="OPERATIONS"\s+hideLauncher/);
    assert.match(shellSrc, /pb-20/);

    const ordersSrc = read('src/components/marketplace/provider/ProviderOrdersView.tsx');
    assert.match(ordersSrc, /ProviderUavSelectField/);
    assert.match(ordersSrc, /variant="outline"/);
    assert.match(ordersSrc, /disabled=\{!hasAssignmentChanged\s*\|\|\s*!selectedUavId/);
    assert.match(ordersSrc, /formatProviderConflictError/);
    assert.match(ordersSrc, /<IllustrativeBadge\/>/);
    assert.match(ordersSrc, /<IllustrativeFooterNote\/>/);

    for (const rel of [
        'src/components/marketplace/provider/ProviderFleetView.tsx',
        'src/components/marketplace/provider/ProviderPilotsView.tsx',
        'src/components/marketplace/provider/ProviderListingsView.tsx',
        'src/components/marketplace/provider/ProviderWalletView.tsx',
    ]) {
        assert.match(read(rel), /<IllustrativeFooterNote\/>/, `${rel} must render IllustrativeFooterNote`);
    }
});




