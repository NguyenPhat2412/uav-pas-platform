import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
// Candidate checks can read unchanged files from a separate canonical source tree.
const fallbackRoot = process.env.UAV_GUARD_FALLBACK_ROOT;
const ts = (fallbackRoot ? createRequire(resolve(fallbackRoot, 'package.json')) : require)('typescript');
const source = path => {
    const candidate = resolve(sourceRoot, path);
    return readFileSync(existsSync(candidate) ? candidate : resolve(fallbackRoot || sourceRoot, path), 'utf8');
};
const element = (type, props) => ({type, props: props || {}});
// Stub translator resolves keys against the Vietnamese catalogs so rendered text stays assertable.
const viCatalog = {
    ...JSON.parse(source('src/messages/vi.json')),
    ...JSON.parse(source('src/messages/sections/admin/vi.json')),
};
const translate = (key, params) => {
    const value = key.split('.').reduce((node, part) => node && typeof node === 'object' ? node[part] : undefined, viCatalog);
    if (typeof value !== 'string') return key;
    return Object.entries(params ?? {}).reduce((text, [name, param]) => text.replaceAll(`{${name}}`, String(param)), value);
};
const content = node => {
    if (node == null || typeof node === 'boolean') return '';
    if (Array.isArray(node)) return node.map(content).join('');
    if (typeof node !== 'object') return String(node);
    return typeof node.type === 'function' ? content(node.type(node.props)) : content(node.props.children);
};

function harness(auth, search, storedDemo) {
    const redirects = [];
    const cards = [];
    const permissions = [];
    const context = {
        ...auth, user: auth.isAuthenticated ? {id: 42, role: auth.role ?? 'ROLE_ADMIN'} : null,
        can: permission => {
            permissions.push(permission);
            return !!auth.allowed;
        }, refreshPermissions() {
        }
    };
    const modules = {
        react: {
            useEffect: callback => callback(), useLayoutEffect: callback => callback(), useState: () => [true, () => {
            }],
            // AdminPage renders outside the portal layout here, so it falls back to its own frame.
            createContext: () => ({Provider: ({children}) => children}), useContext: () => null
        },
        'react/jsx-runtime': {jsx: element, jsxs: element, Fragment: 'fragment'},
        // The guarded page is a deep link; sign-in must bring the visitor back to it.
        'next/navigation': {useRouter: () => ({replace: path => redirects.push(path)}), usePathname: () => '/admin/users'},
        'lucide-react': Object.fromEntries(['Database', 'ShieldAlert', 'ArrowUpRight', 'Users', 'MapPin', 'Plane', 'History', 'ChevronRight', 'CreditCard', 'Settings', 'ShieldCheck'].map(name => [name, () => null])),
        'next/link': {default: ({children}) => children},
        '@/components/shared/presentation': {
            displayLabel: value => value,
            formatDate: value => value,
            auditDetail: value => value
        },
        '@tanstack/react-query': {
            useQuery: options => Object.hasOwn(auth, 'summary') ? {
                data: options.queryKey.includes('admin-dashboard') ? auth.summary : {content: []},
                isPending: false,
                error: null
            } : options
        },
        '@/providers/AuthContext': {useAuth: () => context},
        '@/providers/I18nContext': {
            useI18n: () => ({
                t: translate,
                locale: 'vi',
                formatDate: value => value,
                formatNumber: value => String(value),
                formatCurrency: value => String(value)
            })
        },
        '@/components/ui': {
            KpiCard: props => {
                cards.push(props);
                return [props.value, props.meta];
            }, Spinner: () => 'AUTH_LOADING', Alert: ({children}) => children, Button: ({children}) => children
        },
        '@/components/layout/AppShell': {AppShell: ({children}) => children},
        '@/components/layout/PageHeader': {PageHeader: () => null},
        '@/lib/api': {
            ApiError: class extends Error {
            }
        },
        '@/lib/query': {queryKeys: {feature: (id, feature) => ['session', id, feature]}},
        '@/lib/api/collection': {
            fetchCollection: () => {
                throw new Error('Guard test must not issue network requests');
            }
        },
        './services/admin.service': {adminService: {}},
        '../services/admin.service': {adminService: {}},
        '@/features/dashboard/components/AdminMonitoringCard': {AdminMonitoringCard: () => null},
    };
    modules['@/components/ui'] = modules['@/components/ui'];
    modules['@/components/layout/AdminAppShell'] = modules['@/components/layout/AppShell'];
    modules['@/features/users/api/users.api'] = {usersService: {}};
    modules['@/features/access/api/access.api'] = {accessService: {}};
    modules['@/features/dashboard/api/admin-dashboard.api'] = {adminDashboardService: {}};
    modules['@/features/audit/api/audit.api'] = {auditService: {}};
    modules['@/features/missions/api/missions.api'] = {missionService: {}};
    modules['@/features/dashboard/components/AdminMonitoringCard'] = {AdminMonitoringCard: () => null};

    function load(path) {
        const compiled = ts.transpileModule(source(path), {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
            }
        }).outputText;
        const exports = {};
        vm.runInNewContext(compiled, {
            exports, require: name => {
                assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
                return modules[name];
            }, URL, window: {location: {search}, localStorage: {getItem: key => key === 'isDemo' ? storedDemo : null}}
        }, {filename: path});
        return exports;
    }

    modules['@/lib/api/routes'] = load('src/lib/api/routes.ts');
    modules['@/lib/query'] = load('src/lib/query/index.ts');
    modules['@/features/dashboard/hooks/query-keys'] = load('src/features/dashboard/hooks/query-keys.ts');
    modules['@/features/dashboard/hooks/useAdminDashboard'] = load('src/features/dashboard/hooks/useAdminDashboard.ts');
    modules['@/features/audit/hooks/useAdminAudit'] = load('src/features/audit/hooks/useAdminAudit.ts');
    modules['@/components/data/WorkspaceState'] = load('src/components/data/WorkspaceState.tsx');
    modules['@/features/auth/utils/portal'] = load('src/features/auth/utils/portal.ts');
    modules['@/features/auth/utils/auth-entry'] = load('src/features/auth/utils/auth-entry.ts');
    return {load, redirects, permissions, cards};
}

for (const [search, storedDemo] of [['', null], ['?demo=true', null], ['', 'true'], ['?demo=true', 'true']]) {
    const mode = `query=${search || '(none)'}, storedDemo=${storedDemo}`;
    for (const state of [
        {
            name: 'anonymous',
            isAuthenticated: false,
            isLoading: false,
            permissionsReady: false,
            allowed: false,
            visible: false,
            redirect: true
        },
        {
            name: 'session loading',
            isAuthenticated: false,
            isLoading: true,
            permissionsReady: false,
            allowed: false,
            visible: false,
            redirect: false
        },
        {
            name: 'permission denied',
            isAuthenticated: true,
            isLoading: false,
            permissionsReady: true,
            allowed: false,
            visible: false,
            redirect: false
        },
        {
            name: 'permissions loading',
            isAuthenticated: true,
            isLoading: false,
            permissionsReady: false,
            allowed: true,
            visible: false,
            redirect: false
        },
        {
            name: 'permission error',
            isAuthenticated: true,
            isLoading: false,
            permissionsReady: true,
            allowed: true,
            permissionError: new Error('permission unavailable'),
            visible: false,
            redirect: false
        },
        {
            name: 'authorized',
            isAuthenticated: true,
            isLoading: false,
            permissionsReady: true,
            allowed: true,
            visible: true,
            redirect: false
        },
    ]) test(`AdminPage protects ${state.name} with ${mode}`, () => {
        const h = harness(state, search, storedDemo);
        const {AdminPage} = h.load('src/components/layout/AdminPage.tsx');
        const rendered = content(AdminPage({
            title: 'Users',
            permission: 'USER_READ',
            activeResource: 'users',
            children: 'PROTECTED_USER_DATA'
        }));
        assert.equal(rendered.includes('PROTECTED_USER_DATA'), state.visible);
        // Anonymous visitors go to the shared sign-in dialog on the home page, then back to the page they asked for
        // (path and query; `?`/`=` are escaped so the query survives as part of `next`).
        const next = '/admin/users' + (search ? encodeURIComponent(search) : '');
        assert.deepEqual(h.redirects, state.redirect ? [`/?auth=login&next=${next}`] : []);
        if (state.visible) assert.ok(h.permissions.includes('USER_READ'));
    });

    for (const [role, home] of [['ROLE_PILOT', '/customer/dashboard'], ['ROLE_OPERATOR', '/operations'], ['ROLE_COMMANDER', '/operations']]) {
        test(`AdminPage sends ${role} to its own portal with ${mode}`, () => {
            const h = harness({
                isAuthenticated: true, isLoading: false, permissionsReady: true, allowed: true, role
            }, search, storedDemo);
            const {AdminPage} = h.load('src/components/layout/AdminPage.tsx');
            const rendered = content(AdminPage({
                title: 'Users',
                permission: 'USER_READ',
                activeResource: 'users',
                children: 'PROTECTED_USER_DATA'
            }));
            assert.ok(!rendered.includes('PROTECTED_USER_DATA'));
            assert.deepEqual(h.redirects, [home]);
        });
    }

    for (const [ready, allowed] of [[false, false], [false, true], [true, false], [true, true]]) {
        test(`admin user query requires ready USER_READ (${ready}/${allowed}) with ${mode}`, () => {
            const h = harness({isAuthenticated: true, permissionsReady: ready, allowed}, search, storedDemo);
            const {useAdminUsers} = h.load('src/features/users/hooks/useAdminUsers.ts');
            assert.equal(useAdminUsers(0, '').enabled, ready && allowed);
        });
    }
    for (const [enabled, allowed] of [[false, false], [false, true], [true, false], [true, true]]) {
        test(`operations collection honors MEDIA_READ and caller enable (${enabled}/${allowed}) with ${mode}`, () => {
            const h = harness({isAuthenticated: true, permissionsReady: true, allowed}, search, storedDemo);
            const {useCollection} = h.load('src/hooks/useCollection.ts');
            assert.equal(useCollection('media', enabled).enabled, enabled && allowed);
            if (enabled) assert.ok(h.permissions.includes('MEDIA_READ'));
        });
    }
}

for (const [available, total, expectedValue, expectedMeta] of [
    [3, 20, 3, 'Tổng số: 20 UAV'],
    [0, 20, 0, 'Tổng số: 20 UAV'],
    [undefined, undefined, '—', 'Tổng số: — UAV'],
]) test(`admin dashboard preserves ready/total fleet data (${available}/${total})`, () => {
    const h = harness({
        isAuthenticated: true, permissionsReady: true, allowed: true,
        summary: {totalUsers: 1, totalStations: 1, availableUavs: available, totalUavs: total, totalAuditEvents: 1}
    }, '', null);
    const {Dashboard} = h.load('src/features/dashboard/components/AdminDashboard.tsx');
    content(Dashboard());
    const fleet = h.cards.find(card => card.label === 'UAV sẵn sàng');
    assert.ok(fleet);
    assert.equal(fleet.value, expectedValue);
    assert.equal(fleet.meta, expectedMeta);
});
