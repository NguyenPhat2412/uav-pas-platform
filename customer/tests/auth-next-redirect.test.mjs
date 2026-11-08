import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const ts = createRequire(import.meta.url)('typescript');
const source = readFileSync(new URL('../src/utils/auth/auth-entry.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const sandboxModule = {exports: {}};
vm.runInNewContext(js, {module: sandboxModule, exports: sandboxModule.exports, URL, encodeURIComponent});
const {authEntryUrl, safeNextPath} = sandboxModule.exports;

test('post-login next stays on this site', () => {
    for (const evil of ['//evil.com', '/\\evil.com', '/\\/evil.com', '/\t/evil.com', '/\n/evil.com', 'https://evil.com', 'evil.com', '', null])
        assert.equal(safeNextPath(evil), null, JSON.stringify(evil));
    assert.equal(safeNextPath('/admin/dashboard'), '/admin/dashboard');
    assert.equal(safeNextPath('/customer/missions?status=DRAFT#top'), '/customer/missions?status=DRAFT#top');
});

test('auth entry keeps slashes readable and escapes a nested query', () => {
    assert.equal(authEntryUrl('login', '/admin/dashboard'), '/?auth=login&next=/admin/dashboard');
    const url = authEntryUrl('login', '/customer/missions?status=DRAFT&page=2');
    assert.equal(new URLSearchParams(url.slice(2)).get('next'), '/customer/missions?status=DRAFT&page=2');
    assert.equal(authEntryUrl('register'), '/?auth=register');
});
