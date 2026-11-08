import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../src/utils/errors/runtime-error.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const {isChunkLoadError, errorReference, shouldAutoReload, CHUNK_RELOAD_WINDOW_MS} =
    await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

test('runtime errors: stale-build chunk failures are recognised, ordinary bugs are not', () => {
    assert.equal(isChunkLoadError({name: 'ChunkLoadError', message: 'x'}), true);
    assert.equal(isChunkLoadError({message: 'Loading chunk 812 failed.'}), true);
    assert.equal(isChunkLoadError({message: 'Failed to fetch dynamically imported module: /_next/static/chunks/a.js'}), true);
    assert.equal(isChunkLoadError({message: "Cannot read properties of null (reading 'y')"}), false);
    assert.equal(isChunkLoadError(null), false);
});

test('runtime errors: the reference is short, stable per error and prefers the server digest', () => {
    const error = {name: 'TypeError', message: "Cannot read properties of null (reading 'y')", stack: "TypeError: x\n    at Map.panTo (leaflet.js:1:2)"};
    const ref = errorReference(error);
    assert.match(ref, /^[0-9A-Z]{6}$/);
    assert.equal(errorReference({...error}), ref);
    assert.notEqual(errorReference({...error, message: 'other'}), ref);
    assert.equal(errorReference({digest: 'abc123def456'}), 'ABC123DEF4');
    assert.match(errorReference(undefined), /^[0-9A-Z]{6}$/);
});

test('runtime errors: a stale build reloads once, not in a loop', () => {
    assert.equal(shouldAutoReload(null, 1000), true);
    assert.equal(shouldAutoReload(1000, 1000 + CHUNK_RELOAD_WINDOW_MS - 1), false);
    assert.equal(shouldAutoReload(1000, 1000 + CHUNK_RELOAD_WINDOW_MS + 1), true);
});
