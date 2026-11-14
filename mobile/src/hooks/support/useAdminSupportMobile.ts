import {useCallback, useEffect, useRef, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {mobileSupportService} from '@/api/support/support.api';
import {sessionStore} from '@/lib/api/session';
import {realtimeWs, type RealtimeServerFrame} from '@/lib/realtime/realtime-ws';
import {useAuth} from '@/providers/AuthContext';
import {supportKeys} from '@/shared/hooks/support/query-keys';
import type {PageResponse} from '@/shared/types';
import type {
    SupportQuickReplyInput,
    SupportReplyInput,
    SupportThread,
    SupportThreadDetail,
    SupportThreadFilter,
    SupportThreadStatus,
} from '@/shared/types/support/support.types';

const VISITOR_TYPING_TIMEOUT_MS = 5_000;
const ADMIN_TYPING_THROTTLE_MS = 1_800;
const ADMIN_TYPING_IDLE_MS = 3_000;

let sharedVisitorTyping: Record<number, boolean> = {};
const typingTimers = new Map<number, ReturnType<typeof setTimeout>>();
const typingListeners = new Set<(next: Record<number, boolean>) => void>();
let lastHandledAdminFrame: RealtimeServerFrame | null = null;

function setVisitorTypingState(threadId: number, typing: boolean) {
    const existingTimer = typingTimers.get(threadId);
    if (existingTimer) {
        clearTimeout(existingTimer);
        typingTimers.delete(threadId);
    }
    if (typing) {
        sharedVisitorTyping = {...sharedVisitorTyping, [threadId]: true};
        const timer = setTimeout(() => {
            typingTimers.delete(threadId);
            if (sharedVisitorTyping[threadId]) {
                const copy = {...sharedVisitorTyping};
                delete copy[threadId];
                sharedVisitorTyping = copy;
                typingListeners.forEach(listener => listener(sharedVisitorTyping));
            }
        }, VISITOR_TYPING_TIMEOUT_MS);
        typingTimers.set(threadId, timer);
    } else if (sharedVisitorTyping[threadId]) {
        const copy = {...sharedVisitorTyping};
        delete copy[threadId];
        sharedVisitorTyping = copy;
    } else {
        return;
    }
    typingListeners.forEach(listener => listener(sharedVisitorTyping));
}

export function useCanManageSupport(): boolean {
    const {status, can} = useAuth();
    return status === 'signed-in' && can('SUPPORT_MANAGE');
}

export function useAdminSupportRealtime(enabled = true, onThreadDeleted?: (threadId: number) => void) {
    const {user} = useAuth();
    const allowed = useCanManageSupport();
    const queryClient = useQueryClient();
    const userId = user?.id;

    const [wsConnected, setWsConnected] = useState<boolean>(() => realtimeWs.isConnected());
    const [visitorTypingByThread, setVisitorTypingByThread] = useState<Record<number, boolean>>(
        () => sharedVisitorTyping,
    );

    const onDeletedRef = useRef(onThreadDeleted);
    useEffect(() => {
        onDeletedRef.current = onThreadDeleted;
    }, [onThreadDeleted]);

    const adminThrottleRef = useRef<Map<number, number>>(new Map());
    const adminIdleTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        typingListeners.add(setVisitorTypingByThread);
        return () => {
            typingListeners.delete(setVisitorTypingByThread);
        };
    }, []);

    useEffect(() => {
        realtimeWs.syncAccessToken(sessionStore.read()?.accessToken ?? null);
    }, [userId, allowed]);

    useEffect(() => {
        if (!enabled || !allowed || userId == null) return;

        const unsubStatus = realtimeWs.subscribeStatus(setWsConnected);
        const unsubFrames = realtimeWs.subscribe(frame => {
            if (frame.type === 'SUPPORT_THREAD_DELETED') {
                onDeletedRef.current?.(frame.threadId);
            }
            if (lastHandledAdminFrame === frame) return;
            lastHandledAdminFrame = frame;

            if (frame.type === 'SUPPORT_VISITOR_TYPING') {
                setVisitorTypingState(frame.threadId, frame.typing);
                return;
            }

            if (frame.type === 'SUPPORT_SUMMARY_UPDATED') {
                queryClient.setQueryData(supportKeys.summary(userId), frame.summary);
                return;
            }

            if (frame.type === 'ADMIN_SUPPORT_UPDATED') {
                const updatedThread = frame.thread;
                if (updatedThread.lastSenderRole === 'VISITOR') {
                    setVisitorTypingState(updatedThread.id, false);
                }
                if (frame.summary) {
                    queryClient.setQueryData(supportKeys.summary(userId), frame.summary);
                } else {
                    void queryClient.invalidateQueries({queryKey: supportKeys.summary(userId)});
                }
                const threadKey = supportKeys.thread(userId, updatedThread.id);
                const isThreadMounted = (queryClient.getQueryCache().find({queryKey: threadKey})?.getObserversCount() ?? 0) > 0;
                if (frame.messages) {
                    queryClient.setQueryData<SupportThreadDetail>(
                        threadKey,
                        {thread: isThreadMounted ? {...updatedThread, unreadForAdmin: 0} : updatedThread, messages: frame.messages},
                    );
                } else {
                    queryClient.setQueryData<SupportThreadDetail>(
                        threadKey,
                        prev => (prev ? {...prev, thread: updatedThread} : prev),
                    );
                    void queryClient.invalidateQueries({queryKey: threadKey});
                }
                if (isThreadMounted && updatedThread.unreadForAdmin > 0) {
                    void mobileSupportService.adminThreadDetail(updatedThread.id).then(() => {
                        void queryClient.invalidateQueries({queryKey: supportKeys.summary(userId)});
                        void queryClient.invalidateQueries({queryKey: supportKeys.threadsAll(userId)});
                    }).catch(() => undefined);
                }
                queryClient.setQueriesData<PageResponse<SupportThread>>(
                    {queryKey: supportKeys.threadsAll(userId)},
                    prev => {
                        if (!prev) return prev;
                        const exists = prev.content.some(item => item.id === updatedThread.id);
                        if (!exists) return prev;
                        const merged = prev.content
                            .map(item => (item.id === updatedThread.id ? updatedThread : item))
                            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
                        return {...prev, content: merged};
                    },
                );
                void queryClient.invalidateQueries({queryKey: supportKeys.threadsAll(userId)});
                return;
            }

            if (frame.type === 'SUPPORT_THREAD_DELETED') {
                setVisitorTypingState(frame.threadId, false);
                queryClient.removeQueries({queryKey: supportKeys.thread(userId, frame.threadId)});
                queryClient.setQueriesData<PageResponse<SupportThread>>(
                    {queryKey: supportKeys.threadsAll(userId)},
                    prev =>
                        prev
                            ? {
                                  ...prev,
                                  content: prev.content.filter(item => item.id !== frame.threadId),
                                  totalElements: Math.max(0, prev.totalElements - 1),
                              }
                            : prev,
                );
                void queryClient.invalidateQueries({queryKey: supportKeys.threadsAll(userId)});
                if (frame.summary) {
                    queryClient.setQueryData(supportKeys.summary(userId), frame.summary);
                } else {
                    void queryClient.invalidateQueries({queryKey: supportKeys.summary(userId)});
                }
            }
        });

        return () => {
            unsubFrames();
            unsubStatus();
        };
    }, [allowed, enabled, queryClient, userId]);

    useEffect(() => {
        const timers = adminIdleTimersRef.current;
        return () => {
            timers.forEach(timer => clearTimeout(timer));
            timers.clear();
        };
    }, []);

    const notifyAdminTyping = useCallback((threadId: number, typing: boolean) => {
        if (!Number.isSafeInteger(threadId) || threadId <= 0) return;
        const existingIdle = adminIdleTimersRef.current.get(threadId);
        if (existingIdle) {
            clearTimeout(existingIdle);
            adminIdleTimersRef.current.delete(threadId);
        }
        if (!typing) {
            adminThrottleRef.current.delete(threadId);
            realtimeWs.sendAdminTyping(threadId, false);
            return;
        }
        const now = Date.now();
        const lastSent = adminThrottleRef.current.get(threadId) ?? 0;
        if (now - lastSent >= ADMIN_TYPING_THROTTLE_MS) {
            adminThrottleRef.current.set(threadId, now);
            realtimeWs.sendAdminTyping(threadId, true);
        }
        const timer = setTimeout(() => {
            adminIdleTimersRef.current.delete(threadId);
            adminThrottleRef.current.delete(threadId);
            realtimeWs.sendAdminTyping(threadId, false);
        }, ADMIN_TYPING_IDLE_MS);
        adminIdleTimersRef.current.set(threadId, timer);
    }, []);

    return {
        wsConnected,
        visitorTypingByThread,
        notifyAdminTyping,
    };
}

export function useAdminSupportSummary(enabled = true) {
    const {user} = useAuth();
    const allowed = useCanManageSupport();
    const {wsConnected} = useAdminSupportRealtime(enabled && allowed);
    return useQuery({
        queryKey: supportKeys.summary(user?.id),
        queryFn: ({signal}) => mobileSupportService.adminSummary(signal),
        enabled: enabled && allowed,
        refetchInterval: wsConnected ? 30_000 : 8_000,
    });
}

export function useAdminSupportThreads(filter: SupportThreadFilter, enabled = true) {
    const {user} = useAuth();
    const allowed = useCanManageSupport();
    const {wsConnected} = useAdminSupportRealtime(enabled && allowed);
    return useQuery({
        queryKey: supportKeys.threads(user?.id, filter),
        queryFn: ({signal}) => mobileSupportService.adminThreads(filter, signal),
        enabled: enabled && allowed,
        refetchInterval: wsConnected ? 30_000 : 8_000,
    });
}

export function useAdminSupportThreadDetail(id: number | null, enabled = true) {
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const allowed = useCanManageSupport();
    const {wsConnected} = useAdminSupportRealtime(enabled && allowed && id !== null);
    return useQuery({
        queryKey: supportKeys.thread(user?.id, id),
        queryFn: async ({signal}) => {
            const detail = await mobileSupportService.adminThreadDetail(id!, signal);
            void queryClient.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
            void queryClient.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
            return detail;
        },
        enabled: enabled && allowed && id !== null,
        refetchInterval: id !== null ? (wsConnected ? 30_000 : 5_000) : false,
    });
}

export function useAdminQuickReplies(enabled = true) {
    const {user} = useAuth();
    const allowed = useCanManageSupport();
    return useQuery({
        queryKey: supportKeys.quickReplies(user?.id),
        queryFn: ({signal}) => mobileSupportService.adminQuickReplies(signal),
        enabled: enabled && allowed,
        staleTime: 30_000,
    });
}

export function useAdminSupportMutations() {
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const userId = user?.id;

    const invalidateInbox = () => {
        void queryClient.invalidateQueries({queryKey: supportKeys.summary(userId)});
        void queryClient.invalidateQueries({queryKey: supportKeys.threadsAll(userId)});
    };

    const reply = useMutation({
        mutationFn: ({id, body}: { id: number; body: SupportReplyInput }) =>
            mobileSupportService.adminReply(id, body),
        onSuccess: (detail, variables) => {
            queryClient.setQueryData(supportKeys.thread(userId, variables.id), detail);
            invalidateInbox();
        },
    });

    const updateStatus = useMutation({
        mutationFn: ({id, status}: { id: number; status: SupportThreadStatus }) =>
            mobileSupportService.adminUpdateStatus(id, status),
        onSuccess: (_thread, variables) => {
            void queryClient.invalidateQueries({queryKey: supportKeys.thread(userId, variables.id)});
            invalidateInbox();
        },
    });

    const deleteThread = useMutation({
        mutationFn: (id: number) => mobileSupportService.adminDeleteThread(id),
        onSuccess: (_res, id) => {
            queryClient.removeQueries({queryKey: supportKeys.thread(userId, id)});
            invalidateInbox();
        },
    });

    const createQuickReply = useMutation({
        mutationFn: (body: SupportQuickReplyInput) => mobileSupportService.adminCreateQuickReply(body),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: supportKeys.quickReplies(userId)});
        },
    });

    const deleteQuickReply = useMutation({
        mutationFn: (id: number) => mobileSupportService.adminDeleteQuickReply(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: supportKeys.quickReplies(userId)});
        },
    });

    return {
        reply,
        updateStatus,
        deleteThread,
        createQuickReply,
        deleteQuickReply,
    };
}
