import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const code = await readFile(new URL('../src/components/shared/navigation.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(code, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText;
const {activeDestination} = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const items = [{href: '/overview'}, {href: '/dispatch/missions'}, {href: '/users'}, {href: '/users/permissions'}];
test('nested dispatch routes keep their navigation and breadcrumb despite a legacy resource hint', () => {
    for (const path of ['/dispatch/missions', '/dispatch/missions/42', '/dispatch/missions/42/']) assert.equal(activeDestination(items, path, 'dispatch').href, '/dispatch/missions');
});
test('matches complete segments and prefers the most specific visible destination', () => {
    assert.equal(activeDestination(items, '/users/permissions/3').href, '/users/permissions');
    assert.equal(activeDestination(items, '/users-other'), undefined);
    assert.equal(activeDestination(items.filter(i => i.href !== '/dispatch/missions'), '/dispatch/missions', 'dispatch'), undefined);
    assert.equal(activeDestination(items, '/users/2', 'overview').href, '/users');
});
test('resource fallback supports aliased pages and root does not swallow every destination', () => {
    assert.equal(activeDestination(items, '/missions/2', 'dispatch').href, '/dispatch/missions');
    assert.equal(activeDestination([{href: '/'}, ...items], '/users/3').href, '/users');
    assert.equal(activeDestination([{href: '/'}, ...items], '/').href, '/');
    assert.equal(activeDestination([{href: '/'}, ...items], '/missing'), undefined);
});

const slugCode = await readFile(new URL('../src/lib/url-slugs.ts', import.meta.url), 'utf8');
const slugJs = ts.transpileModule(slugCode, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText;
const {
    slugifyText,
    parseEntityId,
    toMissionSlug,
    toUserSlug,
    toUavSlug,
    toStationSlug,
    toServiceSlug,
    resolveServiceIdFromParam,
    resolveUavIdFromParam,
    resolveStationIdFromParam,
} = await import('data:text/javascript;base64,' + Buffer.from(slugJs).toString('base64'));

test('URL-friendly slugs format human-readable identifiers and parse back to exact numeric IDs', () => {
    assert.equal(slugifyText('Nguyễn Xuân Phát #2412'), 'nguyen-xuan-phat-2412');
    assert.equal(toMissionSlug({id: 15, code: 'MSN-2026-0015'}), 'msn-2026-0015-15');
    assert.equal(toUserSlug({id: 4, username: 'nguyen_van_an'}), 'nguyen-van-an-4');
    assert.equal(toUavSlug({id: 9, serialNumber: 'UAV-M350-VN-009'}), 'uav-m350-vn-009-9');
    assert.equal(toStationSlug({id: 2, code: 'HN-VJU-01'}), 'hn-vju-01-2');
    assert.equal(toServiceSlug({id: 3, code: 'AREA_INSPECTION'}), 'area-inspection-3');

    assert.equal(parseEntityId('15'), 15);
    assert.equal(parseEntityId('msn-2026-0015-15'), 15);
    assert.equal(parseEntityId('nguyen-van-an-4'), 4);
    assert.ok(Number.isNaN(parseEntityId('invalid-slug')));
    assert.ok(Number.isNaN(parseEntityId('0')));

    const services = [{id: 3, code: 'AREA_INSPECTION', name: 'Khảo sát khu vực'}];
    assert.equal(resolveServiceIdFromParam('area-inspection-3', null, services), 3);
    assert.equal(resolveServiceIdFromParam('area-inspection', null, services), 3);
    assert.equal(resolveServiceIdFromParam(null, '3', services), 3);

    const uavs = [{id: 9, serialNumber: 'UAV-M350-VN-009', model: 'Matrice 350 RTK'}];
    assert.equal(resolveUavIdFromParam('uav-m350-vn-009-9', null, uavs), '9');
    assert.equal(resolveUavIdFromParam('UAV-M350-VN-009', null, uavs), '9');
    assert.equal(resolveUavIdFromParam(null, '9', uavs), '9');

    const stations = [{id: 2, code: 'HN-VJU-01', name: 'Trạm Hòa Lạc'}];
    assert.equal(resolveStationIdFromParam('hn-vju-01-2', stations), 2);
    assert.equal(resolveStationIdFromParam('HN-VJU-01', stations), 2);
});

const sidebarRoutesSource = await readFile(new URL('../src/components/layout/sidebar-routes.ts', import.meta.url), 'utf8');
test('centralized sidebar-routes config separates Admin access-control sub-pages and groups Operations routes', () => {
    for (const route of [
        '/admin/access-control',
        '/admin/access-control/role-templates',
        '/admin/access-control/role-matrix',
        '/admin/access-control/permissions',
        '/operations/sar-cockpit',
        '/operations/dispatch/missions',
        '/operations/assigned-missions',
        '/customer/dashboard',
        '/customer/missions',
    ]) {
        assert.match(sidebarRoutesSource, new RegExp(route.replaceAll('/', '\\/')));
    }

    const adminAccessItems = [
        {href: '/admin/access-control', key: 'accessControl'},
        {href: '/admin/access-control/role-templates', key: 'roleTemplates', aliases: ['/admin/role-templates']},
        {href: '/admin/access-control/role-matrix', key: 'roleMatrix', aliases: ['/admin/role-matrix']},
        {href: '/admin/access-control/permissions', key: 'permissions', aliases: ['/admin/permissions']},
    ];
    const resolveActive = (pathname) => {
        const ownerPath = adminAccessItems.find(item =>
            item.aliases?.some(alias => pathname === alias || pathname.startsWith(`${alias}/`)),
        )?.href;
        return activeDestination(adminAccessItems, ownerPath ?? pathname);
    };

    assert.equal(resolveActive('/admin/access-control')?.key, 'accessControl');
    assert.equal(resolveActive('/admin/access-control/role-templates')?.key, 'roleTemplates');
    assert.equal(resolveActive('/admin/role-templates')?.key, 'roleTemplates');
    assert.equal(resolveActive('/admin/access-control/role-matrix')?.key, 'roleMatrix');
    assert.equal(resolveActive('/admin/role-matrix')?.key, 'roleMatrix');
    assert.equal(resolveActive('/admin/access-control/permissions')?.key, 'permissions');
    assert.equal(resolveActive('/admin/permissions')?.key, 'permissions');
});
