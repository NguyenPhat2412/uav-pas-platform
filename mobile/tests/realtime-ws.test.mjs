import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import test from 'node:test';

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === 'expo-secure-store') {
            return {
                url: 'data:text/javascript,' + encodeURIComponent(
                    'const mem = new Map();' +
                    'export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 1;' +
                    'export const getItemAsync = async k => mem.get(k) ?? null;' +
                    'export const setItemAsync = async (k, v) => { mem.set(k, v); };' +
                    'export const deleteItemAsync = async k => { mem.delete(k); };',
                ),
                shortCircuit: true,
            };
        }
        if (specifier.startsWith('@/')) {
            const rel = specifier.slice(2);
            const base = new URL(`../src/${rel}`, import.meta.url);
            for (const candidate of [`${base.href}.ts`, `${base.href}/index.ts`, base.href]) {
                if (existsSync(new URL(candidate))) return nextResolve(candidate, context);
            }
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url.endsWith('.json')) {
            return {
                format: 'module',
                shortCircuit: true,
                source: `export default ${readFileSync(new URL(url), 'utf8')};`,
            };
        }
        return nextLoad(url, context);
    },
});

const {
    HEARTBEAT_INTERVAL_MS,
    buildRealtimeWsUrl,
    createRealtimeWsClient,
} = await import('../src/lib/realtime/realtime-ws.ts');
const {translate} = await import('../src/lib/i18n/catalog.ts');

const readSrc = rel => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

class MockSocket {
    static instances = [];
    readyState = 0;
    onopen = null;
    onmessage = null;
    onerror = null;
    onclose = null;
    sent = [];

    constructor(url) {
        this.url = url;
        MockSocket.instances.push(this);
    }

    open() {
        this.readyState = 1;
        this.onopen?.();
    }

    serverSend(payload) {
        this.onmessage?.({data: typeof payload === 'string' ? payload : JSON.stringify(payload)});
    }

    send(data) {
        this.sent.push(JSON.parse(data));
    }

    close() {
        this.readyState = 3;
        this.onclose?.();
    }
}

const flushAsync = () => new Promise(resolve => setTimeout(resolve, 15));

test('realtime-ws: buildRealtimeWsUrl maps http/https to ws/wss with encoded handshake tokens', () => {
    assert.equal(HEARTBEAT_INTERVAL_MS, 25_000);
    assert.equal(
        buildRealtimeWsUrl('http://192.168.1.20:8080/'),
        'ws://192.168.1.20:8080/api/v1/ws/realtime',
    );
    assert.equal(
        buildRealtimeWsUrl('https://api.uav.all1.vn/api/v1', {
            accessToken: 'jwt+tok/1=2',
            visitorToken: 'vis tok',
        }),
        'wss://api.uav.all1.vn/api/v1/ws/realtime?accessToken=jwt%2Btok%2F1%3D2&visitorToken=vis%20tok',
    );
    assert.equal(
        buildRealtimeWsUrl('http://localhost:8080', {visitorToken: 'vis-only'}),
        'ws://localhost:8080/api/v1/ws/realtime?visitorToken=vis-only',
    );
});

test('realtime-ws: safe when WebSocket constructor is absent in Node environment', async () => {
    const client = createRealtimeWsClient({
        getBaseUrl: () => 'http://localhost:8080',
        getWebSocket: () => undefined,
    });

    const statuses = [];
    const unsubStatus = client.subscribeStatus(s => statuses.push(s));
    const unsubFrames = client.subscribe(() => undefined);
    await flushAsync();

    assert.equal(client.isConnected(), false);
    assert.deepEqual(statuses, [false]);
    assert.equal(client.sendVisitorTyping('tok-1', true), false);
    assert.equal(client.sendAdminTyping(12, true), false);

    unsubFrames();
    unsubStatus();
});

test('realtime-ws: handshake, PING heartbeat, dynamic visitor subscription, typing frames and auto-reconnect', async () => {
    MockSocket.instances = [];
    let currentJwt = 'jwt-initial';

    const client = createRealtimeWsClient({
        getBaseUrl: () => 'http://10.0.0.8:8080',
        getAccessTokenSync: () => currentJwt,
        getVisitorTokenAsync: async () => 'vis-boot',
        getWebSocket: () => MockSocket,
        heartbeatMs: 30,
        backoffBaseMs: 25,
        backoffMaxMs: 100,
    });

    const received = [];
    const statuses = [];
    const unsubStatus = client.subscribeStatus(state => statuses.push(state));
    const unsubFrames = client.subscribe(frame => received.push(frame));

    await flushAsync();
    assert.equal(MockSocket.instances.length, 1);
    const ws1 = MockSocket.instances[0];
    assert.equal(
        ws1.url,
        'ws://10.0.0.8:8080/api/v1/ws/realtime?accessToken=jwt-initial&visitorToken=vis-boot',
    );

    ws1.open();
    assert.equal(client.isConnected(), true);

    ws1.serverSend({type: 'CONNECTED', timestamp: '2026-11-12T17:00:00Z', authenticated: true, adminSupport: false});
    ws1.serverSend({
        type: 'INVOICE_UPDATED',
        timestamp: '2026-11-12T17:00:01Z',
        invoiceId: 501,
        invoiceCode: 'INV-501',
        status: 'PAID',
    });

    assert.equal(received.length, 2);
    assert.equal(received[1].type, 'INVOICE_UPDATED');
    assert.equal(received[1].invoiceId, 501);
    assert.equal(received[1].status, 'PAID');

    // Wait for at least one 30ms heartbeat PING frame
    await new Promise(resolve => setTimeout(resolve, 45));
    assert.ok(ws1.sent.some(frame => frame.type === 'PING'), 'should emit heartbeat PING');

    // Dynamic visitor subscription and typing frames over open socket
    client.setVisitorToken('vis-live-2');
    assert.ok(
        ws1.sent.some(frame => frame.type === 'SUBSCRIBE_VISITOR' && frame.visitorToken === 'vis-live-2'),
    );
    assert.equal(client.sendVisitorTyping('vis-live-2', true), true);
    assert.ok(
        ws1.sent.some(
            frame => frame.type === 'VISITOR_TYPING' && frame.visitorToken === 'vis-live-2' && frame.typing === true,
        ),
    );
    assert.equal(client.sendAdminTyping(123, true), true);
    assert.ok(
        ws1.sent.some(frame => frame.type === 'ADMIN_TYPING' && frame.threadId === 123 && frame.typing === true),
    );

    // Unexpected server close triggers auto-reconnect with latest visitor token
    ws1.close();
    assert.equal(client.isConnected(), false);
    await new Promise(resolve => setTimeout(resolve, 45));
    assert.equal(MockSocket.instances.length, 2);
    const ws2 = MockSocket.instances[1];
    assert.equal(
        ws2.url,
        'ws://10.0.0.8:8080/api/v1/ws/realtime?accessToken=jwt-initial&visitorToken=vis-live-2',
    );
    ws2.open();
    assert.equal(client.isConnected(), true);

    // Token rotation reconnects immediately with updated JWT
    currentJwt = 'jwt-refreshed';
    client.syncAccessToken(currentJwt);
    await flushAsync();
    assert.equal(MockSocket.instances.length, 3);
    assert.match(MockSocket.instances[2].url, /accessToken=jwt-refreshed/);

    unsubFrames();
    unsubStatus();
    assert.equal(client.isConnected(), false);
    assert.ok(statuses.includes(true) && statuses.at(-1) === false);
});

test('realtime-ws: guards unauthenticated empty sockets and connects immediately on setVisitorToken or re-login', async () => {
    MockSocket.instances = [];
    let currentJwt = null;

    const client = createRealtimeWsClient({
        getBaseUrl: () => 'http://localhost:8080',
        getAccessTokenSync: () => currentJwt,
        getVisitorTokenAsync: async () => null,
        getWebSocket: () => MockSocket,
        heartbeatMs: 50,
        backoffBaseMs: 500,
        backoffMaxMs: 1000,
    });

    const unsub = client.subscribe(() => undefined);
    await flushAsync();
    assert.equal(MockSocket.instances.length, 0, 'must not open doomed 401 socket with empty credentials');

    client.setVisitorToken('vis-fresh');
    await flushAsync();
    assert.equal(MockSocket.instances.length, 1, 'must connect immediately once visitorToken arrives');
    assert.equal(MockSocket.instances[0].url, 'ws://localhost:8080/api/v1/ws/realtime?visitorToken=vis-fresh');
    MockSocket.instances[0].open();

    // Clear visitor token and simulate logout -> re-login without poison pill
    client.setVisitorToken(null);
    client.syncAccessToken(null);
    await flushAsync();
    assert.equal(client.isConnected(), false);

    currentJwt = 'jwt-after-relogin';
    client.syncAccessToken(currentJwt);
    await flushAsync();
    assert.equal(MockSocket.instances.length, 2);
    assert.equal(MockSocket.instances[1].url, 'ws://localhost:8080/api/v1/ws/realtime?accessToken=jwt-after-relogin');

    unsub();
});

test('mobile support & billing hooks and screens wire realtime WebSocket cleanly', () => {
    const publicHook = readSrc('hooks/support/usePublicSupportMobile.ts');
    assert.match(publicHook, /SUPPORT_THREAD_UPDATED/);
    assert.match(publicHook, /SUPPORT_THREAD_DELETED/);
    assert.match(publicHook, /SUPPORT_ADMIN_TYPING/);
    assert.match(publicHook, /wsConnected \? 30_000 : 5_000/);

    const publicScreen = readSrc('components/support/PublicSupportSheetScreen.tsx');
    assert.match(publicScreen, /mobile\.support\.liveRealtime/);
    assert.match(publicScreen, /mobile\.support\.adminTyping/);
    assert.match(publicScreen, /notifyVisitorTyping/);

    const adminHook = readSrc('hooks/support/useAdminSupportMobile.ts');
    assert.match(adminHook, /ADMIN_SUPPORT_UPDATED/);
    assert.match(adminHook, /SUPPORT_SUMMARY_UPDATED/);
    assert.match(adminHook, /SUPPORT_THREAD_DELETED/);
    assert.match(adminHook, /SUPPORT_VISITOR_TYPING/);
    assert.match(adminHook, /notifyAdminTyping/);

    const adminInbox = readSrc('components/support/AdminSupportInboxScreen.tsx');
    assert.match(adminInbox, /mobile\.support\.liveRealtime/);
    assert.match(adminInbox, /mobile\.support\.visitorTyping/);

    const adminThreadCard = readSrc('components/support/AdminSupportThreadCard.tsx');
    assert.match(adminThreadCard, /mobile\.support\.visitorTyping/);
    assert.match(adminThreadCard, /notifyAdminTyping/);

    const billingHook = readSrc('hooks/billing/useCustomerBilling.ts');
    assert.match(billingHook, /INVOICE_UPDATED/);
    assert.match(billingHook, /wsConnected/);

    const billingScreen = readSrc('components/billing/BillingScreen.tsx');
    assert.match(billingScreen, /router\.push\('\/customer\/support'\)/);
    const invoiceScreen = readSrc('components/billing/InvoicePaymentScreen.tsx');
    assert.match(invoiceScreen, /router\.push\('\/customer\/support'\)/);

    assert.equal(translate('vi', 'mobile.support.liveRealtime'), 'Trực tuyến · Thời gian thực');
    assert.equal(translate('vi', 'mobile.support.adminTyping'), 'Admin đang nhập phản hồi...');
    assert.equal(translate('vi', 'mobile.support.visitorTyping'), 'Khách đang nhập...');
});
