import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const atRoot = path => `${root}${path}`;
const operations = atRoot('apps/operations');

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test('operations owns the M2 canonical routes and compatibility aliases', () => {
  for (const route of [
    'overview/page.tsx', 'stations/page.tsx', 'uavs/page.tsx', 'inventory/page.tsx',
    'media/page.tsx', 'audit/page.tsx', 'dispatch/missions/page.tsx',
    'assigned-missions/page.tsx', 'missions/[id]/page.tsx', '(auth)/login/page.tsx',
    'operations/page.tsx', 'admin/missions/page.tsx', 'operator/missions/page.tsx',
  ]) assert.equal(existsSync(`${operations}/app/(portal)/${route}`) || existsSync(`${operations}/app/${route}`), true, route);
});

test('operations uses real service endpoints and the shared API boundary', () => {
  const service = readFileSync(`${operations}/src/features/operations/services/operations.service.ts`, 'utf8');
  for (const endpoint of ['/api/v1/stations', '/api/v1/uavs', '/api/v1/inventory', '/api/v1/media', '/api/v1/audit-logs']) assert.match(service, new RegExp(endpoint.replaceAll('/', '\\/')));
  assert.match(readFileSync(`${operations}/src/lib/api.client.ts`, 'utf8'), /@uav\/api-client/);
  for (const path of filesUnder(`${operations}/src`)) {
    if (/\.(ts|tsx)$/.test(path)) assert.doesNotMatch(readFileSync(path, 'utf8'), /\bfetch\s*\(/, path);
  }
});
