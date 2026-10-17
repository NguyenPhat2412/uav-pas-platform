import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const apps = ['web', 'customer', 'operations', 'admin'];
const root = fileURLToPath(new URL('../', import.meta.url));
const atRoot = (path) => `${root}${path}`;

test('each M1 app exposes a 204 health route and standalone build config', () => {
  for (const app of apps) {
    const health = atRoot(`apps/${app}/app/health/route.ts`);
    const config = atRoot(`apps/${app}/next.config.ts`);
    assert.equal(existsSync(health), true, `${health} is missing`);
    assert.match(readFileSync(health, 'utf8'), /status:\s*204/);
    assert.match(readFileSync(config, 'utf8'), /output:\s*['"]standalone['"]/);
  }
});

test('the approved shared package set is present', () => {
  for (const name of ['api-client', 'auth-contracts', 'config', 'design-tokens', 'query', 'types', 'ui']) {
    assert.equal(existsSync(atRoot(`packages/${name}/package.json`)), true, `packages/${name} is missing`);
  }
});
