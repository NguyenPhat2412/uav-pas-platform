import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const at = p => `${root}${p}`;
const admin = at('src/app/(admin)/admin');
const filesUnder = d => readdirSync(d, {withFileTypes: true}).flatMap(e => {
    const p = `${d}/${e.name}`;
    return e.isDirectory() ? filesUnder(p) : [p]
});
test('admin exposes only supported M3 routes inside the single application', () => {
    for (const route of ['(auth)/login/page.tsx', '(portal)/dashboard/page.tsx', '(portal)/users/page.tsx', '(portal)/users/[id]/page.tsx', '(portal)/access-control/page.tsx', '(portal)/role-templates/page.tsx', '(portal)/permissions/page.tsx', '(portal)/audit-logs/page.tsx']) assert.equal(existsSync(`${admin}/${route}`), true, route);
    assert.match(readFileSync(at('package.json'), 'utf8'), /next dev -p 3100/);
    assert.equal(existsSync(`${root}src/app/health/route.ts`), true);
});
test('admin writes only through shared API client and uses actual permission endpoints', () => {
    const source = ['api', 'components', 'content', 'forms', 'hooks', 'types', 'utils'].flatMap(layer => filesUnder(at(`src/${layer}`))).filter(p => /\.(ts|tsx)$/.test(p)).map(p => readFileSync(p, 'utf8')).join('\n');
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    const routes = readFileSync(`${root}src/lib/api/routes.ts`, 'utf8');
    for (const endpoint of ['/api/v1/users', '/api/v1/permissions', '/api/v1/role-templates', '/api/v1/audit-logs', '/api/v1/dashboard/summary']) assert.match(routes, new RegExp(endpoint.replaceAll('/', '\\/')));
    for (const [file, group] of [['api/user/users.api.ts', 'users'], ['api/access/access.api.ts', 'permissions'], ['api/access/access.api.ts', 'roleTemplates'], ['api/audit/audit.api.ts', 'auditLogs'], ['api/dashboard/admin-dashboard.api.ts', 'dashboard']]) {
        assert.match(readFileSync(`${root}src/${file}`, 'utf8'), new RegExp(`API_ROUTES\\.${group}\\.`), file);
    }
    assert.match(readFileSync(`${root}src/components/access/PermissionEditor.tsx`, 'utf8'), /admin\.access\.overrideHint/);
    const adminVi = JSON.parse(readFileSync(`${root}src/messages/sections/admin/vi.json`, 'utf8')).admin;
    assert.match(adminVi.access.overrideHint, /Quyền cho phép hoặc từ chối riêng/);
});
test('admin keeps mission administration in Operations ownership', () => {
    assert.equal(existsSync(at('src/app/(operations)/operations/admin/missions/page.tsx')), true);
    assert.doesNotMatch(readFileSync(`${root}src/components/layout/AdminAppShell.tsx`, 'utf8'), /MISSION_VIEW_ALL|dispatch\/missions/);
});
test('permission editor retains partial write outcomes and supports inherit', () => {
    const model = readFileSync(`${root}src/utils/access/permission-model.ts`, 'utf8');
    assert.match(model, /for \(const change of changes\)/);
    assert.match(model, /failed\.push/);
    assert.match(model, /allowed: null/);
});
