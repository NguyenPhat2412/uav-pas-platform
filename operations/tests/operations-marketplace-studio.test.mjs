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

    const api = read('src/api/marketplace/marketplace.api.ts');
    assert.match(api, /API_ROUTES\.marketplace\.providerMe/);
    assert.match(api, /API_ROUTES\.marketplace\.providerListingsFromTemplate/);
    assert.match(api, /API_ROUTES\.marketplace\.providerFleetUavs/);
    assert.match(api, /API_ROUTES\.marketplace\.providerPilots/);
    assert.match(api, /API_ROUTES\.marketplace\.providerOrderAssign/);
    assert.match(api, /API_ROUTES\.marketplace\.providerOrderStart/);
    assert.match(api, /API_ROUTES\.marketplace\.providerOrderComplete/);
    assert.doesNotMatch(api, /\bfetch\s*\(/);
});

test('S3 wallet view is read-only and displays illustrative badges without withdrawal mutations', () => {
    const walletView = read('src/components/marketplace/provider/ProviderWalletView.tsx');
    assert.match(walletView, /opsMarketplace\.common\.illustrationBadge/);
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

