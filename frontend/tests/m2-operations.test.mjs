import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const atRoot = path => `${root}${path}`;
const operations = atRoot('src/app/(operations)/operations');

function filesUnder(directory) {
    return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
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
    ]) assert.equal(existsSync(`${operations}/(portal)/${route}`) || existsSync(`${operations}/${route}`), true, route);
});

test('operations uses real service endpoints and the shared API boundary', () => {
    const routes = readFileSync(`${root}src/lib/api/routes.ts`, 'utf8');
    for (const endpoint of ['/api/v1/stations', '/api/v1/uavs', '/api/v1/inventory', '/api/v1/media', '/api/v1/audit-logs']) assert.match(routes, new RegExp(endpoint.replaceAll('/', '\\/')));
    for (const [file, group] of [['stations/api/stations.api.ts', 'stations'], ['uavs/api/uavs.api.ts', 'uavs'], ['inventory/api/inventory.api.ts', 'inventory'], ['media/api/media.api.ts', 'media'], ['audit/api/operations-audit.api.ts', 'auditLogs']]) {
        assert.match(readFileSync(`${root}src/features/${file}`, 'utf8'), new RegExp(`API_ROUTES\\.${group}\\.`), file);
    }
    assert.match(readFileSync(`${root}src/lib/api/index.ts`, 'utf8'), /@\/lib\/api/);
    for (const path of filesUnder(atRoot('src/features'))) {
        if (/\.(ts|tsx)$/.test(path)) assert.doesNotMatch(readFileSync(path, 'utf8'), /\bfetch\s*\(/, path);
    }
});
