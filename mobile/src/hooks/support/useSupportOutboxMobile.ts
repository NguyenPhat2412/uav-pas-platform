import {useCallback, useEffect, useRef, useState} from 'react';
import type {OutboxQueueEntry} from '@/shared/utils/support/message-status';

export interface MobileOutboxEnqueueParams {
    scopeKey: string;
    senderRole: 'VISITOR' | 'ADMIN';
    senderName: string;
    content: string;
    requestedThreadStatus?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | null;
}

export function useSupportOutboxMobile(
    dispatchMessage: (entry: OutboxQueueEntry) => Promise<unknown>,
    onSendError?: (error: unknown, entry: OutboxQueueEntry) => void,
) {
    const [outbox, setOutbox] = useState<OutboxQueueEntry[]>([]);
    const outboxRef = useRef<OutboxQueueEntry[]>([]);
    const seqRef = useRef(0);
    const queueRef = useRef<Promise<void>>(Promise.resolve());
    const dispatchRef = useRef(dispatchMessage);
    const errorHandlerRef = useRef(onSendError);

    useEffect(() => {
        dispatchRef.current = dispatchMessage;
        errorHandlerRef.current = onSendError;
    }, [dispatchMessage, onSendError]);

    const updateOutbox = useCallback((updater: (prev: OutboxQueueEntry[]) => OutboxQueueEntry[]) => {
        setOutbox(prev => {
            const next = updater(prev);
            outboxRef.current = next;
            return next;
        });
    }, []);

    const runDispatch = useCallback(
        (entry: OutboxQueueEntry) => {
            queueRef.current = queueRef.current
                .catch(() => undefined)
                .then(async () => {
                    try {
                        await dispatchRef.current(entry);
                        updateOutbox(prev => prev.filter(item => item.clientKey !== entry.clientKey));
                    } catch (err) {
                        updateOutbox(prev =>
                            prev.map(item => (item.clientKey === entry.clientKey ? {...item, status: 'failed'} : item)),
                        );
                        errorHandlerRef.current?.(err, entry);
                    }
                });
        },
        [updateOutbox],
    );

    const enqueue = useCallback(
        (params: MobileOutboxEnqueueParams) => {
            const trimmed = params.content.trim();
            if (!trimmed || !params.scopeKey) return null;
            seqRef.current += 1;
            const entry: OutboxQueueEntry = {
                clientKey: `mob-outbox-${Date.now()}-${seqRef.current}`,
                scopeKey: params.scopeKey,
                senderRole: params.senderRole,
                senderName: params.senderName,
                content: trimmed,
                createdAt: new Date().toISOString(),
                status: 'sending',
                requestedThreadStatus: params.requestedThreadStatus,
            };
            updateOutbox(prev => [...prev, entry]);
            runDispatch(entry);
            return entry;
        },
        [runDispatch, updateOutbox],
    );

    const retry = useCallback(
        (clientKey: string) => {
            const target = outboxRef.current.find(item => item.clientKey === clientKey);
            if (!target || target.status !== 'failed') return;
            const retried: OutboxQueueEntry = {...target, status: 'sending'};
            updateOutbox(prev => prev.map(item => (item.clientKey === clientKey ? retried : item)));
            runDispatch(retried);
        },
        [runDispatch, updateOutbox],
    );

    const clearScope = useCallback(
        (scopeKey?: string | null) => {
            if (!scopeKey) {
                updateOutbox(() => []);
                return;
            }
            updateOutbox(prev => prev.filter(item => item.scopeKey !== scopeKey));
        },
        [updateOutbox],
    );

    return {outbox, enqueue, retry, clearScope};
}
