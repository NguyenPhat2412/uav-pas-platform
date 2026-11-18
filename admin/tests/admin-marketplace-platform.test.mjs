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

    const usersSource = read('src/components/user/Users.tsx');
    assert.match(usersSource, /can\('MARKETPLACE_MODERATE'\)\s*&&\s*<AdminUserProviderCard/);
});
