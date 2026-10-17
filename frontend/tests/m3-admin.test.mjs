import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
const root=fileURLToPath(new URL('../',import.meta.url));
const at=p=>`${root}${p}`;
const admin=at('apps/admin');
const filesUnder=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=`${d}/${e.name}`;return e.isDirectory()?filesUnder(p):[p]});
test('admin exposes only supported M3 routes and independent runtime',()=>{
 for(const route of ['(auth)/login/page.tsx','(portal)/dashboard/page.tsx','(portal)/users/page.tsx','(portal)/users/[id]/page.tsx','(portal)/access-control/page.tsx','(portal)/role-templates/page.tsx','(portal)/permissions/page.tsx','(portal)/audit-logs/page.tsx']) assert.equal(existsSync(`${admin}/app/${route}`),true,route);
 assert.match(readFileSync(`${admin}/package.json`,'utf8'),/"dev":"next dev -p 3103"/);
 assert.equal(existsSync(`${admin}/app/health/route.ts`),true);
});
test('admin writes only through shared API client and uses actual permission endpoints',()=>{
 const source=filesUnder(`${admin}/src`).filter(p=>/\.(ts|tsx)$/.test(p)).map(p=>readFileSync(p,'utf8')).join('\n');
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 const service=readFileSync(`${admin}/src/features/admin/services/admin.service.ts`,'utf8');
 for(const endpoint of ['/api/v1/users','/api/v1/permissions','/api/v1/role-templates','/api/v1/audit-logs','/api/v1/dashboard/summary']) assert.match(service,new RegExp(endpoint.replaceAll('/','\\/')));
 assert.match(readFileSync(`${admin}/src/features/admin/components/PermissionEditor.tsx`,'utf8'),/Quyền cho phép hoặc từ chối riêng/);
});
test('admin keeps mission administration in Operations ownership',()=>{
 assert.equal(existsSync(at('apps/operations/app/admin/missions/page.tsx')),true);
 assert.doesNotMatch(readFileSync(`${admin}/src/components/layout/AppShell.tsx`,'utf8'),/MISSION_VIEW_ALL|dispatch\/missions/);
});
test('permission editor retains partial write outcomes and supports inherit',()=>{
 const model=readFileSync(`${admin}/src/features/admin/permission-model.ts`,'utf8');
 assert.match(model,/for \(const change of changes\)/);
 assert.match(model,/failed\.push/);
 assert.match(model,/allowed: null/);
});
