import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../src/utils/message-status.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
const {computeViewerInitials, mergeMessagesWithOutbox, resolveSupportMessageReceipt} =
    await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

test('message-status: sending & failed render on every outbox row, while sent/delivered/seen render only on latest persisted mine', () => {
    const persisted = [
        {
            id: 1,
            senderRole: 'VISITOR',
            senderName: 'Quân',
            content: 'Tin nhắn 1',
            createdAt: '2026-11-16T10:00:00Z',
            deliveredAt: '2026-11-16T10:00:02Z',
            readAt: '2026-11-16T10:01:00Z',
            seenByName: 'Trần Thu Hà',
        },
        {
            id: 2,
            senderRole: 'ADMIN',
            senderName: 'Trần Thu Hà',
            content: 'Phản hồi từ Admin',
            createdAt: '2026-11-16T10:02:00Z',
        },
        {
            id: 3,
            senderRole: 'VISITOR',
            senderName: 'Quân',
            content: 'Tin nhắn 2',
            createdAt: '2026-11-16T10:03:00Z',
            deliveredAt: '2026-11-16T10:03:01Z',
            readAt: '2026-11-16T10:04:00Z',
            seenByName: 'Trần Thu Hà',
        },
    ];
    const outbox = [
        {
            clientKey: 'out-1',
            scopeKey: 'tok-1',
            senderRole: 'VISITOR',
            senderName: 'Quân',
            content: 'Tin đang gửi',
            createdAt: '2026-11-16T10:05:00Z',
            status: 'sending',
        },
        {
            clientKey: 'out-2',
            scopeKey: 'tok-1',
            senderRole: 'VISITOR',
            senderName: 'Quân',
            content: 'Tin lỗi mạng',
            createdAt: '2026-11-16T10:05:02Z',
            status: 'failed',
        },
    ];

    const merged = mergeMessagesWithOutbox(persisted, outbox, 'tok-1');
    assert.equal(merged.length, 5);
    assert.equal(resolveSupportMessageReceipt(merged, 0, 'VISITOR'), null);
    assert.equal(resolveSupportMessageReceipt(merged, 1, 'VISITOR'), null);

    const latestPersisted = resolveSupportMessageReceipt(merged, 2, 'VISITOR');
    assert.equal(latestPersisted.status, 'seen');
    assert.equal(latestPersisted.label, 'Đã xem');
    assert.equal(latestPersisted.viewerInitials, 'TH');
    assert.match(latestPersisted.detail, /Đã xem bởi Trần Thu Hà/);

    assert.equal(resolveSupportMessageReceipt(merged, 3, 'VISITOR').status, 'sending');
    assert.equal(resolveSupportMessageReceipt(merged, 4, 'VISITOR').status, 'failed');
});

test('message-status: suppresses transient duplicate when WebSocket delivers persisted message before HTTP settles', () => {
    const persisted = [
        {
            id: 99,
            senderRole: 'VISITOR',
            senderName: 'Quân',
            content: 'Xin kiểm tra NFZ',
            createdAt: '2026-11-16T10:10:01Z',
            deliveredAt: null,
            readAt: null,
        },
    ];
    const outbox = [
        {
            clientKey: 'out-99',
            scopeKey: 'tok-1',
            senderRole: 'VISITOR',
            senderName: 'Quân',
            content: 'Xin kiểm tra NFZ',
            createdAt: '2026-11-16T10:10:00Z',
            status: 'sending',
        },
    ];

    const merged = mergeMessagesWithOutbox(persisted, outbox, 'tok-1');
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, 99);
    assert.equal(resolveSupportMessageReceipt(merged, 0, 'VISITOR').status, 'sent');
    assert.equal(computeViewerInitials('Nguyễn Minh Quân'), 'NQ');
});
