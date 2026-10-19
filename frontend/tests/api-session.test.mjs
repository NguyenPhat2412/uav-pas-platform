import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../src/lib/api/index.ts', import.meta.url), 'utf8')).replace(/^export \{ API_ROUTES.*$/m, '');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const user = { id: 1, username: 'alpha', email: 'alpha@example.test', status: 'ACTIVE' };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

const setSession = session => {
  if (api.setAuthSession) return api.setAuthSession(session);
  for (const [key, value] of [['token', session?.accessToken], ['refreshToken', session?.refreshToken]]) {
    if (value) localStorage.setItem(key, value); else localStorage.removeItem(key);
  }
};

test.beforeEach(() => {
  const data = new Map();
  globalThis.localStorage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  globalThis.window = Object.assign(new EventTarget(), { localStorage: globalThis.localStorage });
  setSession({ accessToken: 'old', refreshToken: 'refresh-old', user });
});

test('concurrent expired requests share one refresh and retry with the new token', async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return response({ accessToken: 'new', refreshToken: 'refresh-new', user }); }
    return new Headers(options.headers).get('authorization') === 'Bearer new' ? response({ private: 'alpha' }) : response({ message: 'expired' }, 401);
  };
  const values = await Promise.all([api.apiClient.get('/one'), api.apiClient.get('/two')]);
  assert.equal(refreshes, 1);
  assert.deepEqual(values, [{ private: 'alpha' }, { private: 'alpha' }]);
});

test('logout during refresh cannot restore the previous session', async () => {
  const pending = deferred();
  const started = deferred();
  globalThis.fetch = async url => {
    if (url.endsWith('/auth/refresh')) { started.resolve(); return pending.promise; }
    return response({}, 401);
  };
  const request = api.apiClient.get('/private');
  await started.promise;
  setSession(null);
  pending.resolve(response({ accessToken: 'stale', refreshToken: 'stale', user }));
  await assert.rejects(request);
  assert.equal(localStorage.getItem('token'), null);
});

test('late response from previous account is rejected after an account change', async () => {
  const pending = deferred();
  globalThis.fetch = () => pending.promise;
  const request = api.apiClient.get('/private');
  setSession({ accessToken: 'beta', user: { ...user, id: 2, username: 'beta' } });
  pending.resolve(response({ private: 'alpha' }));
  await assert.rejects(request, error => error.name === 'AbortError');
});

test('failed refresh clears credentials and tells the UI that the session ended', async () => {
  let ended = false;
  window.addEventListener('uav:session', event => { if (!event.detail) ended = true; });
  globalThis.fetch = async () => response({ message: 'revoked' }, 401);
  await assert.rejects(api.apiClient.get('/private'), error => error.status === 401);
  assert.equal(localStorage.getItem('token'), null);
  assert.equal(localStorage.getItem('refreshToken'), null);
  assert.equal(ended, true);
});

test('a forbidden retry reports 403 rather than the original expired-token error', async () => {
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) return response({ accessToken: 'new', user });
    return new Headers(options.headers).get('authorization') === 'Bearer new' ? response({ message: 'permission revoked' }, 403) : response({}, 401);
  };
  await assert.rejects(api.apiClient.get('/private'), error => error.status === 403 && error.message === 'permission revoked');
});
