import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('customer portal exposes supported customer routes and no operations controls', () => {
    const routes = ['dashboard/page.tsx', 'services/page.tsx', 'missions/page.tsx', 'missions/create/page.tsx', 'missions/[id]/page.tsx', 'profile/page.tsx'];
    for (const route of routes) assert.ok(fs.existsSync(path.join(root, 'src/app/(customer)/customer/(portal)', route)), route);
    const detail = read('src/components/mission/customer/CustomerMissionDetail.tsx');
    assert.match(detail, /hooks\/mission\/useCustomerMissions/);
    assert.doesNotMatch(detail, /assignStation|assignUav|assignOperator|confirm\(|reject\(/);
});

test('customer API boundary uses owner-safe mission endpoints and no feature fetch', () => {
    const service = read('src/api/mission/customer-missions.api.ts');
    assert.match(read('src/lib/api/routes.ts'), /\/api\/v1\/missions/);
    assert.match(service, /API_ROUTES\.missions\.submit/);
    assert.match(service, /API_ROUTES\.missions\.cancel/);
    assert.doesNotMatch(service, /customerId=/);
    assert.match(read('src/providers/PortalProviders.tsx'), /AuthProvider/);
    for (const dir of ['src/api', 'src/components', 'src/hooks', 'src/utils', 'src/providers']) {
        const entries = fs.readdirSync(path.join(root, dir), {recursive: true});
        for (const entry of entries) if (String(entry).endsWith('.ts') || String(entry).endsWith('.tsx')) {
            const filePath = path.join(root, dir, String(entry));
            if (fs.statSync(filePath).isFile()) assert.doesNotMatch(fs.readFileSync(filePath, 'utf8'), /\bfetch\s*\(/, filePath);
        }
    }
});

test('customer mission page avoids exposing implementation details', () => {
    assert.doesNotMatch(read('src/components/mission/customer/CustomerMissionDetail.tsx'), /Download dùng signed URL|Backend timeline/);
});
