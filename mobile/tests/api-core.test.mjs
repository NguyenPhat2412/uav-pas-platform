import assert from 'node:assert/strict';
import test from 'node:test';
import {ApiError, createApiClient} from '../src/lib/api/core.ts';

const BASE = 'https://api.example.test';

function json(status, body, headers = {}) {
    return new Response(body === undefined ? null : JSON.stringify(body), {status, headers: {'content-type': 'application/json', ...headers}});
}

/** A client over a scripted fetch; `routes` answers by path, recording every call. */
function setup(routes, tokens = {accessToken: 'a1', refreshToken: 'r1'}) {
    const calls = [];
    const state = {tokens, cleared: []};
    const client = createApiClient({
        baseUrl: BASE,
        refreshPath: '/api/v1/auth/refresh',
        fetch: async (url, init) => {
            calls.push({url, init});
            const path = url.startsWith(BASE) ? url.slice(BASE.length) : url;
            const handler = routes[path.split('?')[0]] ?? routes[url];
            if (!handler) throw new Error(`unexpected ${url}`);
            return handler(init, calls);
        },
        session: {
            read: () => state.tokens,
            save: async next => {
                state.tokens = next;
            },
            clear: async reason => {
                state.tokens = null;
                state.cleared.push(reason);
            },
        },
        headers: () => ({'accept-language': 'vi', 'x-client': 'ios'}),
        text: () => ({sessionExpired: 'expired', tooManyRequests: 'slow down', failed: status => `failed ${status}`}),
        localize: message => (message === 'Invalid username/email or password' ? 'Sai thông tin' : message),
        codeOf: message => (message === 'Invalid username/email or password' ? 'INVALID_CREDENTIALS' : undefined),
    });
    return {client, calls, state};
}

test('api client: sends the Bearer token, X-Client and no cookies', async () => {
    const {client, calls} = setup({'/api/v1/me': () => json(200, {id: 1})});
    assert.deepEqual(await client.get('/api/v1/me'), {id: 1});
    assert.equal(calls[0].init.credentials, 'omit');
    assert.equal(calls[0].init.headers.authorization, 'Bearer a1');
    assert.equal(calls[0].init.headers['x-client'], 'ios');
    assert.equal(calls[0].init.headers['accept-language'], 'vi');
});

test('api client: parallel 401s share one refresh, then retry with the new token', async () => {
    let refreshes = 0;
    const {client, calls, state} = setup({
        '/api/v1/data': init => (init.headers.authorization === 'Bearer a2' ? json(200, {ok: true}) : json(401, {message: 'expired'})),
        '/api/v1/auth/refresh': async init => {
            refreshes += 1;
            assert.deepEqual(JSON.parse(init.body), {refreshToken: 'r1'});
            assert.equal(init.headers['x-client'], 'ios', 'the refresh keeps the phone session separate');
            return json(200, {accessToken: 'a2', refreshToken: 'r2'});
        },
    });
    const results = await Promise.all([client.get('/api/v1/data'), client.get('/api/v1/data'), client.get('/api/v1/data')]);
    assert.deepEqual(results, [{ok: true}, {ok: true}, {ok: true}]);
    assert.equal(refreshes, 1);
    assert.deepEqual(state.tokens, {accessToken: 'a2', refreshToken: 'r2'});
    assert.equal(calls.filter(call => call.url.endsWith('/api/v1/data')).length, 6);
});

test('api client: a refused refresh ends the session', async () => {
    const {client, state} = setup({
        '/api/v1/data': () => json(401, {}),
        '/api/v1/auth/refresh': () => json(401, {message: 'Invalid or expired refresh token'}),
    });
    await assert.rejects(client.get('/api/v1/data'), error => error instanceof ApiError && error.code === 'SESSION_EXPIRED');
    assert.equal(state.tokens, null);
    assert.deepEqual(state.cleared, ['expired']);
});

test('api client: offline, rate-limited or failing refreshes keep the session', async () => {
    for (const [answer, check] of [
        [() => json(429, {}), error => error.status === 429 && error.code === 'RATE_LIMITED'],
        [() => json(503, {}), error => error.status === 503],
        [() => Promise.reject(new TypeError('Network request failed')), error => error.status === 0 && error.code === 'NETWORK_ERROR'],
    ]) {
        const {client, state} = setup({'/api/v1/data': () => json(401, {}), '/api/v1/auth/refresh': answer});
        await assert.rejects(client.get('/api/v1/data'), check);
        assert.deepEqual(state.tokens, {accessToken: 'a1', refreshToken: 'r1'});
    }
});

test('api client: wrong credentials are a sign-in error, not a refresh', async () => {
    const {client, calls} = setup({'/api/v1/auth/login': () => json(401, {message: 'Invalid username/email or password'})}, null);
    await assert.rejects(client.post('/api/v1/auth/login', {usernameOrEmail: 'a', password: 'b'}),
        error => error.status === 401 && error.code === 'INVALID_CREDENTIALS' && error.message === 'Sai thông tin');
    assert.equal(calls.length, 1);
});

test('api client: field errors are kept and localized, 429 is worded plainly', async () => {
    const {client} = setup({
        '/api/v1/missions': () => json(400, {error: 'Bad Request', message: 'Validation failed', fields: {title: 'Invalid username/email or password'}}),
        '/api/v1/auth/forgot-password': () => json(429, {message: 'Rate limit'}),
    });
    await assert.rejects(client.post('/api/v1/missions', {}), error => error.status === 400 && error.fields.title === 'Sai thông tin');
    await assert.rejects(client.post('/api/v1/auth/forgot-password', {}), error => error.message === 'slow down' && error.code === 'RATE_LIMITED');
});

test('api client: signed storage URLs get no token or extra headers', async () => {
    const signed = 'https://storage.example.test/bucket/file.jpg?X-Amz-Signature=abc';
    const {client, calls} = setup({[signed]: () => new Response(null, {status: 200})});
    await client.request(signed, {method: 'PUT', headers: {'Content-Type': 'image/jpeg', 'If-None-Match': '*'}, body: 'bytes'});
    assert.deepEqual(calls[0].init.headers, {'Content-Type': 'image/jpeg', 'If-None-Match': '*'});
});

test('api client: 204 resolves to undefined and text bodies stay text', async () => {
    const {client} = setup({
        '/api/v1/empty': () => new Response(null, {status: 204}),
        '/api/v1/text': () => new Response('pong', {status: 200, headers: {'content-type': 'text/plain'}}),
    });
    assert.equal(await client.delete('/api/v1/empty'), undefined);
    assert.equal(await client.get('/api/v1/text'), 'pong');
});
