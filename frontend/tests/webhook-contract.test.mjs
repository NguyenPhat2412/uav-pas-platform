import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const ts = createRequire(import.meta.url)('typescript');
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const compile = s => ts.transpileModule(s, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
    }
}).outputText;
const load = s => import('data:text/javascript;base64,' + Buffer.from(s).toString('base64'));
const {API_ROUTES} = await load(compile(read('src/lib/api/routes.ts')));
let fixture = 0;

async function service(client) {
    globalThis.__webhookFixture = {API_ROUTES, apiClient: client};
    return (await load('const {API_ROUTES,apiClient}=globalThis.__webhookFixture;\n' + compile(read('src/lib/api/admin.ts')).replace(/^import .*?;\n/gm, '') + `\n//${fixture++}`)).adminService;
}

test('subscription and test requests match actual controller paths and queued response', async () => {
    const calls = [];
    const s = await service({
        get: async url => {
            calls.push(url);
            return [];
        }, post: async (url, body) => {
            calls.push({url, body});
            return {status: 'QUEUED', message: 'queued'};
        }
    });
    await s.webhooks();
    assert.equal(calls[0], '/api/v1/webhooks/subscriptions');
    const result = await s.triggerWebhookTest();
    assert.equal(calls[1].url, '/api/v1/webhooks/test-dispatch');
    assert.equal(calls[1].body.eventType, 'WEBHOOK_TEST');
    assert.equal(result.status, 'QUEUED');
});
test('logs use page content and errors propagate without fixtures', async () => {
    const rows = [{id: 7, deliveryStatus: 'FAILED'}];
    const s = await service({get: async () => ({content: rows, totalElements: 1})});
    assert.deepEqual(await s.webhookLogs(), rows);
    const failed = await service({
        get: async () => {
            throw new Error('denied');
        }, post: async () => {
            throw new Error('denied');
        }
    });
    await assert.rejects(failed.webhooks(), /denied/);
    await assert.rejects(failed.webhookLogs(), /denied/);
    await assert.rejects(failed.triggerWebhookTest(), /denied/);
});
test('page has real error and empty states without fabricated success rows', () => {
    const page = read('src/features/webhooks/components/AdminWebhooksPanel.tsx');
    assert.doesNotMatch(page, /DEFAULT_WEBHOOKS|INITIAL_LOGS|Math.random|setTimeout|catch\(\(\) => \{\}\)/);
    assert.match(page, /role="alert"/);
    assert.match(page, /Chưa cấu hình/);
    assert.match(page, /deliveryStatus/);
});

test('retained cancelled delivery is labelled as removed destination, not success', async () => {
    const page = read('src/features/webhooks/components/AdminWebhooksPanel.tsx');
    const mapper = page.slice(page.indexOf('const statusLabel'), page.indexOf('function WebhooksContent'));
    const {statusLabel} = await load(compile(mapper + '\nexport {statusLabel};'));
    assert.equal(statusLabel('CANCELLED'), 'Đã hủy — đích nhận đã xóa');
    assert.equal(statusLabel('FAILED'), 'Gửi thất bại');
    assert.equal(statusLabel('DELIVERED'), 'Đã nhận HTTP 2xx');
});
