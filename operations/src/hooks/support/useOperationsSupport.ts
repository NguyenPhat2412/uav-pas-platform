'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {operationsSupportService} from '@/api/support/operations-support.api';
import {
    operationsRealtimeClient,
    type OpsSupportQuickReply,
    type OpsSupportStatus,
    type OpsSupportThreadDetail,
} from '@/lib/realtime-ws';
import {useAuth} from '@/providers/AuthContext';

const opsSupportKeys = {
    summary: (userId?: number) => ['ops-support', userId ?? 'anon', 'summary'] as const,
    threads: (userId?: number) => ['ops-support', userId ?? 'anon', 'threads'] as const,
    thread: (userId: number | undefined, id: number | null) => ['ops-support', userId ?? 'anon', 'thread', id] as const,
    quickReplies: (userId?: number) => ['ops-support', userId ?? 'anon', 'quick-replies'] as const,
};

const TOPIC_LABELS: Record<string, string> = {
    GENERAL_SUPPORT: 'Hỗ trợ trực tuyến chung',
    SURVEY_SERVICE: 'Khảo sát GIS / Quay chụp',
    PRICING_PLAN: 'Gói cước & Báo giá',
    FLIGHT_PERMIT_NFZ: 'Xin phép bay & NFZ',
    ACCOUNT_DISPATCH: 'Tài khoản & Điều phối',
    SAR_AI_RND: 'AI & Buồng lái SAR',
    TRAINING_SOP: 'Đào tạo & Học viện SOP',
};

export const OPS_SUPPORT_STATUS_META: Record<OpsSupportStatus, { label: string; badgeClass: string }> = {
    OPEN: {label: 'Mới tiếp nhận', badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200'},
    IN_PROGRESS: {label: 'Đang xử lý', badgeClass: 'bg-amber-50 text-amber-800 ring-amber-200'},
    RESOLVED: {label: 'Đã hoàn tất', badgeClass: 'bg-sky-50 text-sky-700 ring-sky-200'},
};

export function formatOpsSupportTopic(topic?: string | null): string {
    return topic ? (TOPIC_LABELS[topic] ?? topic) : 'Tư vấn chung';
}

export function formatOpsSupportSource(source: string): string {
    if (source === 'CUSTOMER_PORTAL') return 'Cổng khách hàng';
    if (source === 'LIVE_WIDGET') return 'Chat trực tuyến';
    return 'Biểu mẫu liên hệ';
}

export function formatOpsSupportTime(iso?: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSec < 45) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return date.toLocaleString('vi-VN', {hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'});
}

export function personalizeOpsQuickReply(template: string, fullName?: string | null): string {
    return template.replace(/\{name\}/gi, fullName?.trim() || 'Anh/Chị');
}

export function prioritizeOpsQuickReplies(items: readonly OpsSupportQuickReply[], topic?: string | null) {
    const rank = (itemTopic?: string | null) => {
        if (topic && itemTopic === topic) return 0;
        if (!itemTopic || itemTopic === 'GENERAL_SUPPORT') return 1;
        return 2;
    };
    return [...items].sort((a, b) => rank(a.topic) - rank(b.topic) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
}

export function useOperationsSupportRealtime(enabled = true) {
    const {user} = useAuth();
    const client = useQueryClient();
    const active = Boolean(user) && enabled;

    const [wsConnected, setWsConnected] = useState<boolean>(() => operationsRealtimeClient.isConnected());
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

        const unsubStatus = operationsRealtimeClient.subscribeStatus(connected => {
            setWsConnected(connected);
            if (connected) {
                void client.invalidateQueries({queryKey: opsSupportKeys.summary(user?.id)});
                void client.invalidateQueries({queryKey: opsSupportKeys.threads(user?.id)});
            }
        });

        const unsubFrames = operationsRealtimeClient.subscribeFrames(frame => {
            if (frame.type === 'ADMIN_SUPPORT_UPDATED') {
                if (frame.summary) {
                    client.setQueryData(opsSupportKeys.summary(user?.id), frame.summary);
                }
                const threadKey = opsSupportKeys.thread(user?.id, frame.thread.id);
                const isMounted = (client.getQueryCache().find({queryKey: threadKey})?.getObserversCount() ?? 0) > 0;
                if (frame.messages && client.getQueryData<OpsSupportThreadDetail>(threadKey)) {
                    client.setQueryData<OpsSupportThreadDetail>(threadKey, {
                        thread: isMounted ? {...frame.thread, unreadForAdmin: 0} : frame.thread,
                        messages: frame.messages,
                    });
                }
                if (isMounted && frame.thread.unreadForAdmin > 0) {
                    void operationsSupportService.thread(frame.thread.id).then(() => {
                        void client.invalidateQueries({queryKey: opsSupportKeys.summary(user?.id)});
                        void client.invalidateQueries({queryKey: opsSupportKeys.threads(user?.id)});
                    }).catch(() => undefined);
                }
                void client.invalidateQueries({queryKey: opsSupportKeys.threads(user?.id)});
                if (frame.thread.lastSenderRole === 'VISITOR') clearThreadTyping(frame.thread.id);
            } else if (frame.type === 'SUPPORT_SUMMARY_UPDATED') {
                client.setQueryData(opsSupportKeys.summary(user?.id), frame.summary);
            } else if (frame.type === 'SUPPORT_THREAD_DELETED') {
                client.removeQueries({queryKey: opsSupportKeys.thread(user?.id, frame.threadId)});
                if (frame.summary) client.setQueryData(opsSupportKeys.summary(user?.id), frame.summary);
                void client.invalidateQueries({queryKey: opsSupportKeys.threads(user?.id)});
                clearThreadTyping(frame.threadId);
            } else if (frame.type === 'SUPPORT_VISITOR_TYPING') {
                if (!frame.typing) {
                    clearThreadTyping(frame.threadId);
                    return;
                }
                const prevTimer = expiryTimers.current.get(frame.threadId);
                if (prevTimer) clearTimeout(prevTimer);
                setTypingByThread(prev => ({...prev, [frame.threadId]: frame.senderName?.trim() || 'Khách hàng'}));
                expiryTimers.current.set(frame.threadId, setTimeout(() => clearThreadTyping(frame.threadId), 4500));
            }
        });

        const timersSnapshot = expiryTimers.current;
        return () => {
            unsubStatus();
            unsubFrames();
            for (const timer of timersSnapshot.values()) clearTimeout(timer);
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
        operationsRealtimeClient.send({type: 'ADMIN_TYPING', threadId, typing});
    }, []);

    return {wsConnected, typingByThread, notifyAdminTyping};
}

export function useOpsSupportSummary(enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: opsSupportKeys.summary(user?.id),
        queryFn: ({signal}) => operationsSupportService.summary(signal),
        enabled: Boolean(user) && enabled,
        refetchInterval: () => (operationsRealtimeClient.isConnected() ? 30_000 : 6_000),
    });
}

export function useOpsSupportThreads(enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: opsSupportKeys.threads(user?.id),
        queryFn: ({signal}) => operationsSupportService.threads(12, signal),
        enabled: Boolean(user) && enabled,
        refetchInterval: () => (operationsRealtimeClient.isConnected() ? 30_000 : 6_000),
    });
}

export function useOpsSupportThreadDetail(id: number | null) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useQuery({
        queryKey: opsSupportKeys.thread(user?.id, id),
        queryFn: async ({signal}) => {
            const detail = await operationsSupportService.thread(id as number, signal);
            void client.invalidateQueries({queryKey: opsSupportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: opsSupportKeys.threads(user?.id)});
            return detail;
        },
        enabled: Boolean(user) && id !== null && id > 0,
        refetchInterval: () => (operationsRealtimeClient.isConnected() ? 25_000 : 4_000),
    });
}

export function useOpsSupportQuickReplies(enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: opsSupportKeys.quickReplies(user?.id),
        queryFn: ({signal}) => operationsSupportService.quickReplies(signal),
        enabled: Boolean(user) && enabled,
    });
}

export function useOpsReplySupportThread() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({id, content, status}: { id: number; content: string; status?: OpsSupportStatus | null }) =>
            operationsSupportService.reply(id, {content, status}),
        onSuccess: (detail, variables) => {
            client.setQueryData(opsSupportKeys.thread(user?.id, variables.id), detail);
            void client.invalidateQueries({queryKey: opsSupportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: opsSupportKeys.threads(user?.id)});
        },
    });
}
