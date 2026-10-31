import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile(new URL('../src/utils/media/media-policy.ts', import.meta.url), 'utf8');
const compiled = ts.transpile(source, {module: ts.ModuleKind.ESNext});
const policy = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('the picker offers exactly the types the API accepts, and the policy text states the limits', () => {
    assert.deepEqual(policy.MEDIA_ACCEPT.split(','), ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm']);
    assert.match(policy.mediaUploadPolicy(), /100 MB.*1 GB/);
});

test('type and size are judged by the API (MediaUploadPolicy), not re-checked in the browser', () => {
    assert.equal(policy.validateMediaFile, undefined);
    assert.equal(policy.MediaFileError, undefined);
});
