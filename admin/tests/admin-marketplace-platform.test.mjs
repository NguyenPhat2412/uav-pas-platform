import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';

const ts = createRequire(new URL('../package.json', import.meta.url))('typescript');
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const compile = source =>
    ts.transpileModule(source, {
        compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
    }).outputText;

const load = source => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function collectLeafKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj ?? {})) {
        const next = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) keys.push(...collectLeafKeys(v, next));
        else keys.push(next);
    }
    return keys.sort();
}

test('adminI18nService.namespaces unwraps DTO { namespaces: string[] } from backend', async () => {
    const {API_ROUTES} = await load(compile(read('src/lib/api/routes.ts')));
    globalThis.__i18nTest = {
        API_ROUTES,
        apiClient: {
            get: async url => {
                assert.equal(url, '/api/v1/admin/i18n/namespaces');
                return {namespaces: ['admin', 'adminCommerce', 'common']};
            },
            put: async () => ({}),
            post: async () => ({}),
            delete: async () => undefined,
        },
    };
    try {
        const compiled = compile(read('src/api/i18n/i18n.api.ts')).replace(/^import .*?;\n/gm, '');
        const {adminI18nService} = await load('const {API_ROUTES,apiClient}=globalThis.__i18nTest;\n' + compiled);
        const result = await adminI18nService.namespaces();
        assert.deepEqual(result, ['admin', 'adminCommerce', 'common']);
    } finally {
        delete globalThis.__i18nTest;
    }
});

test('admin hooks gate server queries behind permissionsReady and PermissionCode checks', () => {
    const marketplaceHooks = read('src/hooks/marketplace/useAdminMarketplace.ts');
    assert.match(marketplaceHooks, /permissionsReady && can\('MARKETPLACE_MODERATE'\)/);
    assert.match(marketplaceHooks, /permissionsReady && can\('PAYOUT_MANAGE'\)/);
    assert.match(marketplaceHooks, /keepPreviousData/);
    assert.match(marketplaceHooks, /useOpenProviderDocument/);

    const usersSource = read('src/components/user/Users.tsx');
    assert.match(usersSource, /can\('MARKETPLACE_MODERATE'\)\s*&&\s*<AdminUserProviderCard/);
});

test('trilingual adminCommerce.marketplace catalog maintains 100% leaf-key parity and passes content-guard', () => {
    const vi = JSON.parse(read('src/messages/sections/adminCommerce/vi.json')).adminCommerce.marketplace;
    const en = JSON.parse(read('src/messages/sections/adminCommerce/en.json')).adminCommerce.marketplace;
    const ja = JSON.parse(read('src/messages/sections/adminCommerce/ja.json')).adminCommerce.marketplace;

    assert.deepEqual(collectLeafKeys(en), collectLeafKeys(vi));
    assert.deepEqual(collectLeafKeys(ja), collectLeafKeys(vi));

    const banned = /\b(VJU|VNU|tactical|combat)\b|tác chiến|chiến đấu|sĩ quan|chiến thuật|bản demo|\(\s*(minh hoạ|minh họa|mô phỏng|giả lập)\s*\)/i;
    for (const [locale, obj] of [['vi', vi], ['en', en], ['ja', ja]]) {
        assert.doesNotMatch(JSON.stringify(obj), banned, `Banned wording in ${locale} marketplace catalog`);
    }
});

test('Provider moderation UI wires skeleton, error/empty states, document drawer, and <= 300 line limit', async () => {
    const form = await load(compile(read('src/forms/marketplace/admin-marketplace-form.ts')));
    const rejectedWithoutNote = form.validateProviderModerationInput({status: 'REJECTED', rawNote: '   '});
    assert.equal(rejectedWithoutNote.ok, false);
    assert.equal(rejectedWithoutNote.code, 'NOTE_REQUIRED');

    const badFee = form.validateProviderModerationInput({status: 'VERIFIED', rawFeePct: '65'});
    assert.equal(badFee.ok, false);
    assert.equal(badFee.code, 'INVALID_FEE_RATE');

    for (const rel of [
        'src/components/marketplace/MarketplaceShared.tsx',
        'src/components/marketplace/AdminMarketplaceProviders.tsx',
        'src/components/marketplace/ProviderModerationRow.tsx',
        'src/components/marketplace/ProviderKycDrawer.tsx',
        'src/components/marketplace/AdminMarketplaceListings.tsx',
        'src/components/marketplace/ListingModerationRow.tsx',
        'src/components/marketplace/ListingModerationDrawer.tsx',
    ]) {
        const src = read(rel);
        const lines = src.split('\n').length;
        assert.ok(lines <= 301, `${rel} must stay <= 300 lines (got ${lines - 1})`);
    }

    const listingRejectedWithoutNote = form.validateListingModerationInput({
        status: 'REJECTED',
        rawNote: ' ',
        featured: false,
    });
    assert.equal(listingRejectedWithoutNote.ok, false);
    assert.equal(listingRejectedWithoutNote.code, 'NOTE_REQUIRED');

    const listingPublished = form.validateListingModerationInput({
        status: 'PUBLISHED',
        rawNote: ' Đạt chuẩn dịch vụ ',
        featured: true,
    });
    assert.deepEqual(listingPublished, {
        ok: true,
        payload: {status: 'PUBLISHED', moderationNote: 'Đạt chuẩn dịch vụ', featured: true},
    });
});

test('Admin dispatch queue wires manual/auto endpoints, ORDER_UPDATED realtime, and <= 300 line cap', async () => {
    const {API_ROUTES} = await load(compile(read('src/lib/api/routes.ts')));
    assert.equal(API_ROUTES.adminMarketplace.dispatch, '/api/v1/admin/marketplace/dispatch');
    assert.equal(API_ROUTES.adminMarketplace.dispatchMission(77), '/api/v1/admin/marketplace/dispatch/77');
    assert.equal(API_ROUTES.adminMarketplace.dispatchMissionAuto(77), '/api/v1/admin/marketplace/dispatch/77/auto');
    assert.equal(API_ROUTES.adminMarketplace.stats, '/api/v1/admin/marketplace/stats');

    const wsClient = read('src/lib/realtime-ws.ts');
    assert.match(wsClient, /ORDER_UPDATED/);

    const hookSource = read('src/hooks/marketplace/useAdminMarketplace.ts');
    assert.match(hookSource, /useAdminMarketplaceRealtime/);
    assert.match(hookSource, /ORDER_UPDATED/);

    const form = await load(compile(read('src/forms/marketplace/admin-marketplace-form.ts')));
    assert.deepEqual(form.buildManualDispatchInput({providerId: 9, rawNote: ' Giao ưu tiên '}), {
        providerId: 9,
        note: 'Giao ưu tiên',
    });
    assert.deepEqual(form.buildAutoDispatchInput({missionId: 77, rawNote: '  '}), {
        missionId: 77,
        note: undefined,
    });

    for (const rel of [
        'src/components/marketplace/AdminMarketplaceDispatch.tsx',
        'src/components/marketplace/DispatchQueueCard.tsx',
        'src/components/marketplace/AdminMarketplaceOrders.tsx',
        'src/components/marketplace/OrderTwoSidedDrawer.tsx',
        'src/components/marketplace/AdminMarketplaceStats.tsx',
        'src/components/marketplace/AdminMarketplacePayouts.tsx',
    ]) {
        const lines = read(rel).split('\n').length;
        assert.ok(lines <= 301, `${rel} must stay <= 300 lines (got ${lines - 1})`);
    }

    assert.equal(form.canAdminCancelMarketplaceOrder('PENDING_CONFIRMATION', 'PENDING'), true);
    assert.equal(form.canAdminCancelMarketplaceOrder('CONFIRMED', 'SCHEDULED'), true);
    assert.equal(form.canAdminCancelMarketplaceOrder('IN_PROGRESS', 'IN_FLIGHT'), false);
    assert.equal(form.canAdminCancelMarketplaceOrder('COMPLETED', 'DELIVERED'), false);
    assert.equal(form.canAdminCancelMarketplaceOrder('CANCELLED', 'CANCELLED'), false);

    assert.equal(form.validateAdminOrderCancelReason('   ').ok, false);
    assert.deepEqual(form.validateAdminOrderCancelReason(' Khách yêu cầu đổi lịch '), {
        ok: true,
        reason: 'Khách yêu cầu đổi lịch',
    });
});

test('Admin customer projects & subscriptions governance wires read-only view, subscription cancel, and <= 300 line cap', async () => {
    const {API_ROUTES} = await load(compile(read('src/lib/api/routes.ts')));
    assert.equal(API_ROUTES.projects.list, '/api/v1/projects');
    assert.equal(API_ROUTES.projects.detail(12), '/api/v1/projects/12');
    assert.equal(API_ROUTES.projects.subscriptions(12), '/api/v1/projects/12/subscriptions');
    assert.equal(API_ROUTES.projects.subscriptionById(12, 34), '/api/v1/projects/12/subscriptions/34');

    const form = await load(compile(read('src/forms/marketplace/admin-marketplace-form.ts')));
    assert.equal(form.canAdminCancelSubscription('ACTIVE'), true);
    assert.equal(form.canAdminCancelSubscription('PAUSED'), true);
    assert.equal(form.canAdminCancelSubscription('ENDED'), false);
    assert.equal(form.canAdminCancelSubscription(null), false);
    assert.equal(
        form.sanitizeMarketplaceText('Tàu bay quang học (' + 'minh hoạ)'),
        'Tàu bay quang học — minh hoạ',
    );

    const sidebar = read('src/config/sidebar-routes.ts');
    assert.match(sidebar, /\/admin\/marketplace\/projects/);
    assert.match(sidebar, /marketplaceProjects/);

    for (const rel of [
        'src/components/marketplace/AdminMarketplaceProjects.tsx',
        'src/components/marketplace/ProjectSubscriptionsDrawer.tsx',
        'src/app/(admin)/admin/(portal)/marketplace/projects/page.tsx',
    ]) {
        const src = read(rel);
        const lines = src.split('\n').length;
        assert.ok(lines <= 301, `${rel} must stay <= 300 lines (got ${lines - 1})`);
    }
});

test('Admin audit log localizes marketplace moderation, dispatch, project, and cancellation entities across vi/en/ja', async () => {
    const pres = await load(compile(read('src/lib/presentation.ts')));
    const auditView = read('src/components/audit/AdminAuditLogs.tsx');
    for (const entity of [
        'PROVIDER_PROFILE',
        'MARKETPLACE_LISTING',
        'MISSION_DISPATCH',
        'PROVIDER_PAYOUT',
        'PROJECT',
        'PROJECT_SUBSCRIPTION',
    ]) {
        assert.match(auditView, new RegExp(`'${entity}'`));
    }

    for (const locale of ['vi', 'en', 'ja']) {
        pres.setPresentationLocale(locale);
        for (const key of [
            'PROVIDER_PROFILE',
            'MARKETPLACE_LISTING',
            'MISSION_DISPATCH',
            'PROVIDER_PAYOUT',
            'PROJECT',
            'PROJECT_SUBSCRIPTION',
            'VERIFIED',
            'PUBLISHED',
            'PAID',
        ]) {
            const out = pres.displayLabel(key);
            assert.notEqual(out, key, `${key} should be localized in ${locale}`);
        }
        const dispatchDetail = pres.auditDetail('providerId=4');
        assert.match(dispatchDetail, /#4/);
        assert.doesNotMatch(dispatchDetail, /^providerId=/);
    }
    pres.setPresentationLocale('vi');
});

test('Every marketplace component t() lookup resolves in vi/en/ja with matching placeholders and zero leaked Vietnamese in en/ja', () => {
    const bundles = {
        vi: {
            ...JSON.parse(read('src/messages/vi.json')),
            ...JSON.parse(read('src/messages/sections/adminCommerce/vi.json')),
        },
        en: {
            ...JSON.parse(read('src/messages/en.json')),
            ...JSON.parse(read('src/messages/sections/adminCommerce/en.json')),
        },
        ja: {
            ...JSON.parse(read('src/messages/ja.json')),
            ...JSON.parse(read('src/messages/sections/adminCommerce/ja.json')),
        },
    };

    const getByPath = (obj, dotPath) => dotPath.split('.').reduce((acc, part) => acc?.[part], obj);
    const extractPlaceholders = str =>
        Array.from(str.matchAll(/\{([a-zA-Z0-9_]+)\}/g))
            .map(m => m[1])
            .sort()
            .join(',');

    const targetFiles = [
        'src/components/marketplace/MarketplaceShared.tsx',
        'src/components/marketplace/AdminMarketplaceProviders.tsx',
        'src/components/marketplace/ProviderModerationRow.tsx',
        'src/components/marketplace/ProviderKycDrawer.tsx',
        'src/components/marketplace/AdminMarketplaceListings.tsx',
        'src/components/marketplace/ListingModerationRow.tsx',
        'src/components/marketplace/ListingModerationDrawer.tsx',
        'src/components/marketplace/AdminMarketplaceDispatch.tsx',
        'src/components/marketplace/DispatchQueueCard.tsx',
        'src/components/marketplace/AdminMarketplaceOrders.tsx',
        'src/components/marketplace/OrderTwoSidedDrawer.tsx',
        'src/components/marketplace/AdminMarketplaceProjects.tsx',
        'src/components/marketplace/ProjectSubscriptionsDrawer.tsx',
        'src/components/marketplace/AdminMarketplaceStats.tsx',
        'src/components/marketplace/AdminMarketplacePayouts.tsx',
        'src/components/user/AdminUserProviderCard.tsx',
    ];

    const staticKeys = new Set();
    for (const rel of targetFiles) {
        const src = read(rel);
        for (const m of src.matchAll(/\bt\(\s*'((?:adminCommerce|adminNav)\.[a-zA-Z0-9_.]+)'/g)) {
            staticKeys.add(m[1]);
        }
    }
    assert.ok(staticKeys.size >= 90, `Expected >= 90 static marketplace i18n keys, got ${staticKeys.size}`);

    const viDiacritics = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
    for (const key of staticKeys) {
        const viVal = getByPath(bundles.vi, key);
        const enVal = getByPath(bundles.en, key);
        const jaVal = getByPath(bundles.ja, key);
        assert.equal(typeof viVal, 'string', `Missing vi key: ${key}`);
        assert.equal(typeof enVal, 'string', `Missing en key: ${key}`);
        assert.equal(typeof jaVal, 'string', `Missing ja key: ${key}`);
        assert.ok(viVal.trim().length > 0, `Empty vi key: ${key}`);
        assert.ok(enVal.trim().length > 0, `Empty en key: ${key}`);
        assert.ok(jaVal.trim().length > 0, `Empty ja key: ${key}`);
        assert.equal(extractPlaceholders(enVal), extractPlaceholders(viVal), `Placeholder mismatch in en for ${key}`);
        assert.equal(extractPlaceholders(jaVal), extractPlaceholders(viVal), `Placeholder mismatch in ja for ${key}`);
        assert.equal(viDiacritics.test(enVal), false, `Vietnamese diacritic leaked into en for ${key}: ${enVal}`);
        assert.equal(viDiacritics.test(jaVal), false, `Vietnamese diacritic leaked into ja for ${key}: ${jaVal}`);
    }
});
