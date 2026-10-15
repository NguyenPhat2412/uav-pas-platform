import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('customer portal exposes supported customer routes and no operations controls', () => {
  const routes = ['dashboard/page.tsx', 'services/page.tsx', 'missions/page.tsx', 'missions/create/page.tsx', 'missions/[id]/page.tsx', 'profile/page.tsx'];
  for (const route of routes) assert.ok(fs.existsSync(path.join(root, 'apps/customer/app/(portal)', route)), route);
  const detail = read('apps/customer/app/(portal)/missions/[id]/page.tsx');
  assert.match(detail, /features\/customer\/hooks/);
  assert.doesNotMatch(detail, /assignStation|assignUav|assignOperator|confirm\(|reject\(/);
});

test('customer API boundary uses owner-safe mission endpoints and no feature fetch', () => {
  const service = read('apps/customer/src/features/customer/service.ts');
  assert.match(service, /\/api\/v1\/missions/);
  assert.match(service, /\/submit/);
  assert.match(service, /\/cancel/);
  assert.doesNotMatch(service, /customerId=/);
  const files = fs.readdirSync(path.join(root, 'apps/customer/src/features/customer'));
  for (const file of files) if (file.endsWith('.ts') || file.endsWith('.tsx')) assert.doesNotMatch(read(`apps/customer/src/features/customer/${file}`), /\bfetch\s*\(/);
  assert.match(read('apps/customer/src/contexts/AuthContext.tsx'), /@uav\/query\/session/);
  for (const dir of ['apps/customer/src', 'packages/query/src/session']) {
    const entries = fs.readdirSync(path.join(root, dir), { recursive: true });
    for (const entry of entries) if (String(entry).endsWith('.ts') || String(entry).endsWith('.tsx')) {
      const filePath = path.join(root, dir, String(entry));
      if (fs.statSync(filePath).isFile()) assert.doesNotMatch(fs.readFileSync(filePath, 'utf8'), /\bfetch\s*\(/, filePath);
    }
  }
});

test('customer app explains unavailable profile edits without exposing implementation details', () => {
  assert.match(read('apps/customer/app/(portal)/profile/page.tsx'), /Chức năng chỉnh sửa hồ sơ chưa được hỗ trợ/);
  assert.doesNotMatch(read('apps/customer/app/(portal)/missions/[id]/page.tsx'), /Download dùng signed URL|Backend timeline/);
});
