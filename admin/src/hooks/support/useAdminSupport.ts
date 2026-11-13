'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {adminSupportService} from '@/api/support/support.api';
import {supportKeys} from '@/hooks/support/query-keys';
import {adminRealtimeClient} from '@/lib/realtime-ws';
import {useAuth} from '@/providers/AuthContext';
import type {
    SupportQuickReplyInput,
    SupportThreadDetail,
    SupportThreadFilter,
    SupportThreadStatus,
} from '@/types/support/support.types';

export function personalizeQuickReply(template: string, fullName: string): string {
    const cleanName = fullName?.trim() || 'Anh/Chị';
    return template.replace(/\{name\}/gi, cleanName);
}

export function useAdminSupportRealtime(enabled = true) {
    const {user} = useAuth();
    const client = useQueryClient();
    const active = Boolean(user) && enabled;

    const [wsConnected, setWsConnected] = useState<boolean>(() =>
        adminRealtimeClient.isConnected(),
    );
    const [typingByThread, setTypingByThread] = useState<Record<number, string>>({});
    const expiryTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const lastSentTypingAt = useRef<Map<number, number>>(new Map());

    useEffect(() => {
        if (!active) return;

        const clearThreadTyping = (threadId: number) => {
            const existing = expiryTimers.current.get(threadId);
            if (existing) {
                clearTimeout(existing);
                expiryTimers.current.delete(threadId);
            }
            setTypingByThread(prev => {
                if (!(threadId in prev)) return prev;
                const next = {...prev};
                delete next[threadId];
                return next;
            });
        };

        const unsubStatus = adminRealtimeClient.subscribeStatus(connected => {
            setWsConnected(connected);
            if (connected) {
                void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
                void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
            }
        });

        const unsubFrames = adminRealtimeClient.subscribeFrames(frame => {
            if (frame.type === 'ADMIN_SUPPORT_UPDATED') {
                if (frame.summary) {
                    client.setQueryData(supportKeys.summary(user?.id), frame.summary);
                }
                const threadKey = supportKeys.thread(user?.id, frame.thread.id);
                const isThreadMounted = (client.getQueryCache().find({queryKey: threadKey})?.getObserversCount() ?? 0) > 0;
                if (frame.messages && client.getQueryData<SupportThreadDetail>(threadKey)) {
                    client.setQueryData<SupportThreadDetail>(threadKey, {
                        thread: isThreadMounted ? {...frame.thread, unreadForAdmin: 0} : frame.thread,
                        messages: frame.messages,
                    });
                }
                if (isThreadMounted && frame.thread.unreadForAdmin > 0) {
                    void adminSupportService.thread(frame.thread.id).then(() => {
                        void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
                        void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
                    }).catch(() => undefined);
                }
                void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
                if (frame.thread.lastSenderRole === 'VISITOR') {
                    clearThreadTyping(frame.thread.id);
                }
            } else if (frame.type === 'SUPPORT_SUMMARY_UPDATED') {
                client.setQueryData(supportKeys.summary(user?.id), frame.summary);
            } else if (frame.type === 'SUPPORT_THREAD_DELETED') {
                client.removeQueries({queryKey: supportKeys.thread(user?.id, frame.threadId)});
                if (frame.summary) {
                    client.setQueryData(supportKeys.summary(user?.id), frame.summary);
                }
                void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
                clearThreadTyping(frame.threadId);
            } else if (frame.type === 'SUPPORT_VISITOR_TYPING') {
                if (!frame.typing) {
                    clearThreadTyping(frame.threadId);
                    return;
                }
                const prevTimer = expiryTimers.current.get(frame.threadId);
                if (prevTimer) clearTimeout(prevTimer);
                setTypingByThread(prev => ({
                    ...prev,
                    [frame.threadId]: frame.senderName?.trim() || 'Khách hàng',
                }));
                const timer = setTimeout(() => clearThreadTyping(frame.threadId), 4500);
                expiryTimers.current.set(frame.threadId, timer);
            }
        });

        const timersSnapshot = expiryTimers.current;
        return () => {
            unsubStatus();
            unsubFrames();
            for (const timer of timersSnapshot.values()) {
                clearTimeout(timer);
            }
            timersSnapshot.clear();
        };
    }, [active, client, user?.id]);

    const notifyAdminTyping = useCallback((threadId: number, typing: boolean) => {
        if (!threadId || threadId <= 0) return;
        const now = Date.now();
        if (typing) {
            const last = lastSentTypingAt.current.get(threadId) ?? 0;
            if (now - last < 1800) return;
            lastSentTypingAt.current.set(threadId, now);
        } else {
            lastSentTypingAt.current.delete(threadId);
        }
        adminRealtimeClient.send({type: 'ADMIN_TYPING', threadId, typing});
    }, []);

    return {wsConnected, typingByThread, notifyAdminTyping};
}

export function useSupportSummary(enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: supportKeys.summary(user?.id),
        queryFn: ({signal}) => adminSupportService.summary(signal),
        enabled: Boolean(user) && enabled,
        refetchInterval: () => (adminRealtimeClient.isConnected() ? 30_000 : 6_000),
    });
}

export function useSupportThreads(filter: SupportThreadFilter, enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: supportKeys.threads(user?.id, filter),
        queryFn: ({signal}) => adminSupportService.threads(filter, signal),
        enabled: Boolean(user) && enabled,
        refetchInterval: () => (adminRealtimeClient.isConnected() ? 30_000 : 6_000),
    });
}

export function useSupportThreadDetail(id: number | null) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useQuery({
        queryKey: supportKeys.thread(user?.id, id),
        queryFn: async ({signal}) => {
            const detail = await adminSupportService.thread(id as number, signal);
            void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
            return detail;
        },
        enabled: Boolean(user) && id !== null && id > 0,
        refetchInterval: () => (adminRealtimeClient.isConnected() ? 25_000 : 4_000),
    });
}

export function useReplySupportThread() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            content,
            status,
        }: {
            id: number;
            content: string;
            status?: SupportThreadStatus | null;
        }) => adminSupportService.reply(id, {content, status}),
        onSuccess: (detail, variables) => {
            client.setQueryData(supportKeys.thread(user?.id, variables.id), detail);
            void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
        },
    });
}

export function useUpdateSupportStatus() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({id, status}: { id: number; status: SupportThreadStatus }) =>
            adminSupportService.updateStatus(id, status),
        onSuccess: (_thread, variables) => {
            void client.invalidateQueries({queryKey: supportKeys.thread(user?.id, variables.id)});
            void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
        },
    });
}

export function useDeleteSupportThread() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => adminSupportService.deleteThread(id),
        onSuccess: (_void, id) => {
            client.removeQueries({queryKey: supportKeys.thread(user?.id, id)});
            void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
        },
    });
}

export function useSupportQuickReplies(enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: supportKeys.quickReplies(user?.id),
        queryFn: ({signal}) => adminSupportService.quickReplies(signal),
        enabled: Boolean(user) && enabled,
    });
}

export function useCreateSupportQuickReply() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: (input: SupportQuickReplyInput) => adminSupportService.createQuickReply(input),
        onSuccess: () => client.invalidateQueries({queryKey: supportKeys.quickReplies(user?.id)}),
    });
}

export function useDeleteSupportQuickReply() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => adminSupportService.deleteQuickReply(id),
        onSuccess: () => client.invalidateQueries({queryKey: supportKeys.quickReplies(user?.id)}),
    });
}
