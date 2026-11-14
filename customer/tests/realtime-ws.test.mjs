import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const wsSource = read('src/lib/realtime-ws.ts');
const compiledWs = ts.transpileModule(wsSource, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
    },
}).outputText;
const realtimeModule = await import('data:text/javascript;base64,' + Buffer.from(compiledWs).toString('base64'));
const {resolveRealtimeWsUrl, createRealtimeWsManager} = realtimeModule;

test('resolveRealtimeWsUrl derives ws/wss realtime endpoint and encodes visitorToken', () => {
    assert.equal(
        resolveRealtimeWsUrl(null, 'http://localhost:8080'),
        'ws://localhost:8080/api/v1/ws/realtime',
    );
    assert.equal(
        resolveRealtimeWsUrl('tok_abc 123', 'http://localhost:8080/api/v1'),
        'ws://localhost:8080/api/v1/ws/realtime?visitorToken=tok_abc%20123',
    );
    assert.equal(
        resolveRealtimeWsUrl('v1', 'https://api.example.com/api/v1/'),
        'wss://api.example.com/api/v1/ws/realtime?visitorToken=v1',
    );
});

test('realtime manager no-ops gracefully during SSR', () => {
    const ssrManager = createRealtimeWsManager({isBrowser: () => false});
    assert.equal(ssrManager.getStatus(), 'disconnected');
    const release = ssrManager.acquire({authenticated: true, visitorToken: 'tok_ssr'});
    assert.equal(ssrManager.sendFrame({type: 'PING'}), false);
    assert.equal(ssrManager.sendVisitorTyping('tok_ssr', true), false);
    release();
});

test('realtime manager handles visitor subscribe, typing, frames, heartbeat and backoff', async () => {
    const sockets = [];
    class FakeSocket {
        constructor(url) {
            this.url = url;
            this.readyState = 0;
            this.sent = [];
            this.onopen = null;
            this.onmessage = null;
            this.onerror = null;
            this.onclose = null;
            sockets.push(this);
        }
        send(data) {
            this.sent.push(JSON.parse(data));
        }
        close() {
            this.readyState = 3;
            this.onclose?.();
        }
        openServer() {
            this.readyState = 1;
            this.onopen?.();
        }
        emitServer(frame) {
            this.onmessage?.({data: JSON.stringify(frame)});
        }
    }

    const statuses = [];
    const frames = [];
    const manager = createRealtimeWsManager({
        isBrowser: () => true,
        createSocket: (url) => new FakeSocket(url),
        resolveUrl: (token) => resolveRealtimeWsUrl(token, 'http://localhost:8080/api/v1'),
        heartbeatMs: 30,
        idleGraceMs: 10,
        backoffStepsMs: [15, 30, 60, 120],
    });

    const unsubStatus = manager.subscribeStatus((s) => statuses.push(s));
    const unsubEvents = manager.subscribeEvents((f) => frames.push(f));

    // 1. Connect first as authenticated portal customer (no visitorToken yet).
    const releaseAuth = manager.acquire({authenticated: true});
    assert.equal(sockets.length, 1);
    assert.equal(sockets[0].url, 'ws://localhost:8080/api/v1/ws/realtime');
    assert.deepEqual(statuses, ['connecting']);

    sockets[0].openServer();
    assert.equal(manager.getStatus(), 'connected');
    sockets[0].emitServer({type: 'CONNECTED', timestamp: '2026-11-12T00:00:00Z', authenticated: true, adminSupport: false});

    // 2. Dynamically acquire a visitorToken after connect -> sends SUBSCRIBE_VISITOR over open socket.
    const releaseVisitor = manager.acquire({visitorToken: 'vis_99'});
    assert.deepEqual(sockets[0].sent, [{type: 'SUBSCRIBE_VISITOR', visitorToken: 'vis_99'}]);

    // 3. Visitor typing helper sends VISITOR_TYPING frame.
    assert.equal(manager.sendVisitorTyping('vis_99', true), true);
    assert.deepEqual(sockets[0].sent.at(-1), {type: 'VISITOR_TYPING', visitorToken: 'vis_99', typing: true});

    // 4. Server frames (INVOICE_UPDATED & SUPPORT_ADMIN_TYPING) reach subscribers.
    sockets[0].emitServer({
        type: 'INVOICE_UPDATED',
        timestamp: '2026-11-12T00:00:01Z',
        invoiceId: 501,
        invoiceCode: 'INV-501',
        status: 'PAID',
    });
    sockets[0].emitServer({
        type: 'SUPPORT_ADMIN_TYPING',
        timestamp: '2026-11-12T00:00:02Z',
        threadId: 12,
        senderName: 'Admin',
        typing: true,
    });
    assert.equal(frames.some((f) => f.type === 'INVOICE_UPDATED' && f.invoiceId === 501 && f.status === 'PAID'), true);
    assert.equal(frames.some((f) => f.type === 'SUPPORT_ADMIN_TYPING' && f.threadId === 12 && f.typing === true), true);

    // 5. Heartbeat PING fires automatically.
    await new Promise((r) => setTimeout(r, 45));
    assert.equal(sockets[0].sent.some((f) => f.type === 'PING'), true);

    // 6. Unexpected disconnect schedules exponential backoff reconnect with active visitorToken on handshake.
    sockets[0].close();
    assert.equal(manager.getStatus(), 'disconnected');
    await new Promise((r) => setTimeout(r, 25));
    assert.equal(sockets.length, 2);
    assert.equal(sockets[1].url, 'ws://localhost:8080/api/v1/ws/realtime?visitorToken=vis_99');

    releaseVisitor();
    releaseAuth();
    unsubStatus();
    unsubEvents();
    manager.disconnectAll();
});

test('support and billing components keep <= 300 lines, zero emerald classes, and non-overlapping portal dock', () => {
    const dirs = ['src/components/support', 'src/components/billing'];
    for (const dir of dirs) {
        for (const name of fs.readdirSync(path.join(root, dir))) {
            if (!name.endsWith('.tsx')) continue;
            const rel = `${dir}/${name}`;
            const content = read(rel);
            const lineCount = content.split('\n').length;
            assert.ok(lineCount <= 300, `${rel} must stay <= 300 lines (got ${lineCount})`);
            assert.doesNotMatch(content, /\bemerald-/, `${rel} must not contain forbidden emerald-* classes`);
        }
    }
    const customerLayout = read('src/components/customer/CustomerLayout.tsx');
    assert.ok(customerLayout.split('\n').length <= 300, 'CustomerLayout.tsx must stay <= 300 lines');
    assert.match(customerLayout, /<PublicSupportWidget\s+mode="portal"\s*\/>/);

    const launcher = read('src/components/support/PublicSupportLauncher.tsx');
    assert.match(launcher, /bottom-24/, 'portal launcher docks above AssistantWidget (bottom-5)');
});
