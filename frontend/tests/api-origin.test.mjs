import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
// Tests resolve TypeScript from the single application dependency tree.
let ts;
try {
    ts = createRequire(import.meta.url)('typescript');
} catch {
    ts = createRequire(new URL('../package.json', import.meta.url))('typescript');
}

process.env.NEXT_PUBLIC_API_URL = 'http://localhost:18080';
for (const [name, path] of [['application', '../src/lib/api/index.ts']]) {
    const source = (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/^export \{ API_ROUTES.*?from [\'"](?:\.\/routes|@\/lib\/api\/routes)[\'"];$/m, '');
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    const api = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
    test(`${name}: credentials and session recovery stay on the configured API origin`, async () => {
        const original = {fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage};
        const data = new Map();
        globalThis.localStorage = {
            getItem: k => data.get(k) ?? null,
            setItem: (k, v) => data.set(k, v),
            removeItem: k => data.delete(k)
        };
        globalThis.window = Object.assign(new EventTarget(), {localStorage});
        let permissionEvents = 0;
        window.addEventListener('uav:permissions', () => permissionEvents++);
        api.setAuthSession({accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh'});
        try {
            const calls = [];
            let status = 200;
            globalThis.fetch = async (url, options) => {
                calls.push({url, headers: new Headers(options.headers)});
                return new Response('', {status});
            };
            for (const endpoint of ['/api/v1/missions', 'http://localhost:18080/api/v1/missions']) {
                await api.apiRequest(endpoint);
                assert.equal(calls.at(-1).headers.get('authorization'), 'Bearer synthetic-access');
            }
            for (const url of ['http://localhost:9014/bucket/synthetic', 'https://localhost:18080/bucket/synthetic', 'http://localhost.evil.test:18080/bucket/synthetic']) {
                await api.apiRequest(url, {
                    method: 'PUT',
                    body: 'synthetic media',
                    headers: {'Content-Type': 'text/plain'}
                });
                assert.equal(calls.at(-1).headers.get('authorization'), null);
                assert.equal(calls.at(-1).headers.get('content-type'), 'text/plain');
            }
            for (status of [401, 403]) {
                const before = calls.length;
                await assert.rejects(api.apiRequest('http://localhost:9014/bucket/synthetic'), e => e.status === status);
                assert.equal(calls.length, before + 1, 'storage errors must not trigger an API refresh/retry');
                assert.equal(calls.at(-1).headers.get('authorization'), null);
            }
            assert.equal(permissionEvents, 0, 'storage errors do not invalidate API permissions');
            assert.equal(localStorage.getItem('token'), 'synthetic-access');
            assert.equal(localStorage.getItem('refreshToken'), 'synthetic-refresh');
            let refreshes = 0;
            globalThis.fetch = async (url, options) => {
                if (url.endsWith('/auth/refresh')) {
                    refreshes++;
                    return Response.json({accessToken: 'synthetic-new', refreshToken: 'synthetic-new-refresh'});
                }
                return new Headers(options.headers).get('authorization') === 'Bearer synthetic-new'
                    ? Response.json({ok: true}) : Response.json({}, {status: 401});
            };
            assert.deepEqual(await api.apiClient.get('/api/v1/missions'), {ok: true});
            assert.equal(refreshes, 1, 'API requests still refresh and retry');

        } finally {
            Object.assign(globalThis, original);
        }
    });
}

for (const [name, path] of [['application', '../src/lib/api/index.ts']]) {
    const source = (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/^export \{ API_ROUTES.*?from [\'"](?:\.\/routes|@\/lib\/api\/routes)[\'"];$/m, '');
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    const api = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
    test(`${name}: browser upload never sends API cookies or CSRF tokens to storage`, async () => {
        const original = {fetch: globalThis.fetch, window: globalThis.window, document: globalThis.document};
        globalThis.window = Object.assign(new EventTarget(), {
            localStorage: {
                getItem: () => null, removeItem() {
                }
            }
        });
        globalThis.document = {cookie: 'XSRF-TOKEN=synthetic-csrf'};
        const calls = [];
        globalThis.fetch = async (url, options) => {
            calls.push({url, options});
            return new Response('', {status: 200});
        };
        try {
            await api.apiClient.post('/api/v1/missions/42/accept', {expectedVersion: 1});
            assert.equal(calls[0].options.credentials, 'include');
            assert.equal(new Headers(calls[0].options.headers).get('x-xsrf-token'), 'synthetic-csrf');
            await api.apiRequest('http://localhost:9014/bucket/synthetic', {method: 'PUT', body: 'content'});
            assert.equal(calls[1].options.credentials, 'omit');
            assert.equal(new Headers(calls[1].options.headers).get('x-xsrf-token'), null);
        } finally {
            Object.assign(globalThis, original);
        }
    });
}
