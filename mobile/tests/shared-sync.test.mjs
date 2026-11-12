import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';

test('shared modules: src/shared matches frontend/src (run npm run sync:shared after web changes)', () => {
    const script = new URL('../scripts/sync-shared.mjs', import.meta.url).pathname;
    const result = spawnSync(process.execPath, [script, '--check'], {encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('architecture: layer, storage and colour rules hold', () => {
    const script = new URL('../scripts/check-architecture.mjs', import.meta.url).pathname;
    const result = spawnSync(process.execPath, [script], {encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr || result.stdout);
});
