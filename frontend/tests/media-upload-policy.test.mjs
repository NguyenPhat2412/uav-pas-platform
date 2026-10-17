import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile(new URL('../packages/api-client/src/media-policy.ts', import.meta.url), 'utf8');
const compiled = ts.transpile(source, { module: ts.ModuleKind.ESNext });
const policy = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('all allowed media use exact decimal limits and reject one byte overflow', () => {
  for (const type of policy.MEDIA_ACCEPT.split(',')) {
    const max = type.startsWith('video/') ? 1_000_000_000 : 100_000_000;
    assert.equal(policy.validateMediaFile({ type, size: max }), type);
    assert.equal(policy.validateMediaFile({ type, size: 1 }), type);
    for (const size of [max + 1, 0, -1, NaN, Infinity, 1.5]) {
      assert.throws(() => policy.validateMediaFile({ type, size }), /100 MB.*1 GB/);
    }
  }
});

test('unknown, omitted or misleading MIME never falls back to unrestricted binary', () => {
  for (const type of ['', 'text/plain', 'image/gif', 'application/octet-stream', 'image/png; charset=utf-8']) {
    assert.throws(() => policy.validateMediaFile({ type, size: 1 }), /đúng định dạng/);
  }
});
