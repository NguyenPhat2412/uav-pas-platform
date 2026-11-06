import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {ApiError, bytesToBase64, createApiClient} from '../src/lib/api/core.ts';
import {API_ROUTES} from '../src/shared/lib/api/routes.ts';

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

test('api client: getBytes refreshes on 401 and bytesToBase64 encodes binary PDFs for Share sheet', async () => {
    assert.equal(API_ROUTES.billing.invoiceReceipt(55), '/api/v1/billing/invoices/55/receipt');
    assert.equal(API_ROUTES.billing.sepayWebhook, '/api/v1/billing/webhook/sepay');

    for (const sample of ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar', '%PDF-1.4\n%%EOF']) {
        const bytes = new Uint8Array(Buffer.from(sample, 'utf8'));
        assert.equal(bytesToBase64(bytes), Buffer.from(sample, 'utf8').toString('base64'));
    }

    // Large binary payload (> 64 KB) must encode cleanly without spread-argument call stack overflow.
    const large = new Uint8Array(70_000);
    for (let i = 0; i < large.length; i += 1) large[i] = (i * 31) & 0xff;
    assert.equal(bytesToBase64(large), Buffer.from(large).toString('base64'));

    const pdfBytes = new Uint8Array(Buffer.from('%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF', 'utf8'));
    let refreshes = 0;
    const {client, state} = setup({
        '/api/v1/billing/invoices/55/receipt': init =>
            init.headers.authorization === 'Bearer a2'
                ? new Response(pdfBytes, {status: 200, headers: {'content-type': 'application/pdf'}})
                : json(401, {message: 'expired'}),
        '/api/v1/auth/refresh': async () => {
            refreshes += 1;
            return json(200, {accessToken: 'a2', refreshToken: 'r2'});
        },
    });
    const downloaded = await client.getBytes(API_ROUTES.billing.invoiceReceipt(55), {headers: {Accept: 'application/pdf'}});
    assert.equal(refreshes, 1);
    assert.deepEqual(state.tokens, {accessToken: 'a2', refreshToken: 'r2'});
    assert.equal(`data:application/pdf;base64,${bytesToBase64(downloaded)}`, `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`);

    const customerApiSource = readFileSync(new URL('../src/api/billing/customer-billing.api.ts', import.meta.url), 'utf8');
    assert.match(customerApiSource, /receiptDataUri:/);
    assert.doesNotMatch(customerApiSource, /confirmPayment/, 'customer mobile app must never call admin-only confirmPayment');

    const hookSource = readFileSync(new URL('../src/hooks/billing/useCustomerBilling.ts', import.meta.url), 'utf8');
    assert.match(hookSource, /refetchInterval:.*status === 'PENDING' \? 5000 : false/);
    assert.match(hookSource, /downloadReceipt:/);

    const screenSource = readFileSync(new URL('../src/components/billing/InvoicePaymentScreen.tsx', import.meta.url), 'utf8');
    assert.match(screenSource, /Share\.share\(/);
    assert.match(screenSource, /mobile\.billing\.checkStatus/);
    assert.match(screenSource, /mobile\.billing\.shareReceiptPdf/);
});
