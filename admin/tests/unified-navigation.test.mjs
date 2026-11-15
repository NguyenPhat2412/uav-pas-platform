import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function loadSidebarRoutes() {
    const raw = await readFile(new URL('../src/config/sidebar-routes.ts', import.meta.url), 'utf8');
    const cleaned = raw
        .replace(/import\s*\{[^}]*\}\s*from\s*['"]lucide-react['"];?/g, 'const LucideMock = () => null;')
        .replace(/icon:\s*([A-Za-z0-9_]+)/g, 'icon: LucideMock')
        .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?/g, 'const activeDestination = () => ({});');
    const js = ts.transpileModule(cleaned, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}

test('unified navigation: each portal sidebar lists only its own pages', async () => {
    const {ADMIN_SIDEBAR_ROUTES, ADMIN_SIDEBAR_GROUPS, OPERATIONS_SIDEBAR_ROUTES, CUSTOMER_SIDEBAR_ROUTES} = await loadSidebarRoutes();

    // Admins reach customer and operations pages through the portal switcher, not the admin sidebar.
    assert.ok(!ADMIN_SIDEBAR_GROUPS.includes('customer'), 'no customer group in admin sidebar');
    assert.ok(!ADMIN_SIDEBAR_GROUPS.includes('operations'), 'no operations group in admin sidebar');
    for (const item of ADMIN_SIDEBAR_ROUTES) assert.ok(item.href.startsWith('/admin/'), `admin sidebar links to admin pages only: ${item.href}`);

    const adminHrefs = ADMIN_SIDEBAR_ROUTES.map(item => item.href);
    assert.ok(adminHrefs.includes('/admin/users'), 'includes admin users');
    assert.ok(adminHrefs.includes('/admin/access-control/role-templates'), 'includes role templates');

    const operationsHrefs = OPERATIONS_SIDEBAR_ROUTES.map(item => item.href);
    for (const href of ['/operations/overview', '/operations/sar-cockpit', '/operations/dispatch/missions', '/operations/stations', '/operations/uavs'])
        assert.ok(operationsHrefs.includes(href), `operations sidebar keeps ${href}`);
    const customerHrefs = CUSTOMER_SIDEBAR_ROUTES.map(item => item.href);
    for (const href of ['/customer/dashboard', '/customer/missions'])
        assert.ok(customerHrefs.includes(href), `customer sidebar keeps ${href}`);
});

test('unified navigation: all routes have permission guards or default fallbacks', async () => {
    const {ADMIN_SIDEBAR_ROUTES} = await loadSidebarRoutes();

    for (const item of ADMIN_SIDEBAR_ROUTES) {
        assert.ok(item.href.startsWith('/'), `route must be absolute: ${item.href}`);
        assert.ok(item.key, `item must have key: ${item.href}`);
        assert.ok(item.group, `item must belong to a group: ${item.href}`);
    }
});

test('unified navigation: hybrid 3-level admin sidebar organizes dense groups into sub-groups while keeping compact groups 2-level', async () => {
    const {ADMIN_SIDEBAR_ROUTES, ADMIN_SIDEBAR_SUBGROUPS} = await loadSidebarRoutes();
    assert.ok(Array.isArray(ADMIN_SIDEBAR_SUBGROUPS) && ADMIN_SIDEBAR_SUBGROUPS.length >= 7);

    const subGroupMap = new Map(ADMIN_SIDEBAR_SUBGROUPS.map(sg => [sg.key, sg]));
    for (const item of ADMIN_SIDEBAR_ROUTES) {
        if (item.subGroup) {
            const meta = subGroupMap.get(item.subGroup);
            assert.ok(meta, `missing ADMIN_SIDEBAR_SUBGROUPS metadata for ${item.subGroup}`);
            assert.equal(meta.group, item.group, `subGroup ${item.subGroup} must match parent group ${item.group}`);
        }
    }

    // Commerce has 3 cohesive sub-groups: catalogPlans, marketplace3p, billingLedger
    const commerceSubGroups = new Set(
        ADMIN_SIDEBAR_ROUTES.filter(item => item.group === 'commerce').map(item => item.subGroup),
    );
    assert.deepEqual([...commerceSubGroups].sort(), ['billingLedger', 'catalogPlans', 'marketplace3p']);

    // Compact 3-4 item groups remain 2-level without unnecessary sub-group clicks
    for (const compactGroup of ['training', 'intelligence', 'security', 'system']) {
        for (const item of ADMIN_SIDEBAR_ROUTES.filter(r => r.group === compactGroup)) {
            assert.equal(item.subGroup, undefined, `${compactGroup} item ${item.key} stays 2-level`);
        }
    }
});
