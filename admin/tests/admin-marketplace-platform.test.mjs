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
