import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = p => readFileSync(root + p, 'utf8');
test('one application owns build, dependencies and source aliases', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.equal(pkg.workspaces, undefined);
    assert.equal(pkg.scripts.dev, 'next dev -p 3100');
    assert.equal(pkg.scripts.start, 'node scripts/start.mjs');
    assert.ok(!Object.keys(pkg.dependencies).some(k => k.startsWith('@uav/')));
    assert.deepEqual(JSON.parse(read('tsconfig.json')).compilerOptions.paths, {'@/*': ['./src/*']});
    assert.match(read('next.config.ts'), /output: 'standalone'/);
});
test('public and portal areas have distinct routes inside one Next application', () => {
    for (const p of ['(public)/page.tsx', '(customer)/customer/(portal)/dashboard/page.tsx', '(operations)/operations/(portal)/overview/page.tsx', '(admin)/admin/(portal)/dashboard/page.tsx', 'health/route.ts']) assert.ok(existsSync(root + 'src/app/' + p), p);
    assert.match(read('src/app/health/route.ts'), /status:\s*204/);
});
test('feature route entries contain no duplicated page implementation', () => {
    const walk = d => readdirSync(d, {withFileTypes: true}).flatMap(e => e.name.startsWith('._') ? [] : e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
    const pages = walk(root + 'src/app').filter(p => p.endsWith('/page.tsx'));
    assert.ok(pages.length >= 56);
    for (const p of pages) {
        const s = readFileSync(p, 'utf8');
        assert.match(s, /from ['"]@\/(api|components|content|forms|hooks|types|utils)\/[a-z-]+\//, p);
        assert.doesNotMatch(s, /useState|apiClient|useQuery/, p);
    }
});
