import {useCallback, useEffect, useRef, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {ApiError} from '@/lib/api/client';
import {sessionStore} from '@/lib/api/session';
import {realtimeWs} from '@/lib/realtime/realtime-ws';
import {
    clearSupportVisitorToken,
    readSupportVisitorToken,
    writeSupportVisitorToken,
} from '@/lib/storage/secure-tokens';
import {mobileSupportService} from '@/api/support/support.api';
import {useAuth} from '@/providers/AuthContext';
import {supportKeys} from '@/shared/hooks/support/query-keys';
import type {
    PublicSupportCreateInput,
    PublicSupportThreadSession,
} from '@/shared/types/support/support.types';

const ADMIN_TYPING_TIMEOUT_MS = 5_000;
const VISITOR_TYPING_THROTTLE_MS = 1_800;
const VISITOR_TYPING_IDLE_MS = 3_000;

let cachedVisitorToken: string | null = null;
let hydratedCache = false;
const tokenListeners = new Set<(next: string | null) => void>();

function publishVisitorToken(next: string | null) {
    cachedVisitorToken = next;
    hydratedCache = true;
    tokenListeners.forEach(listener => listener(next));
}

export function usePublicSiteInfo() {
    return useQuery({
        queryKey: supportKeys.siteInfo(),
        queryFn: ({signal}) => mobileSupportService.siteInfo(signal),
        staleTime: 5 * 60_000,
    });
}

export function usePublicSupportSession(markRead = false) {
    const queryClient = useQueryClient();
    const {user} = useAuth();
    const [visitorToken, setVisitorToken] = useState<string | null>(cachedVisitorToken);
    const [hydrated, setHydrated] = useState<boolean>(() => hydratedCache || cachedVisitorToken !== null);
    const [wsConnected, setWsConnected] = useState<boolean>(() => realtimeWs.isConnected());
    const [adminTyping, setAdminTyping] = useState(false);

    const adminTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const visitorTypingThrottleRef = useRef<number>(0);
    const visitorStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearAdminTypingTimer = useCallback(() => {
        if (adminTypingTimerRef.current !== null) {
            clearTimeout(adminTypingTimerRef.current);
            adminTypingTimerRef.current = null;
        }
    }, []);

    const clearVisitorStopTimer = useCallback(() => {
        if (visitorStopTimerRef.current !== null) {
            clearTimeout(visitorStopTimerRef.current);
            visitorStopTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        const listener = (next: string | null) => setVisitorToken(next);
        tokenListeners.add(listener);
        if (!hydratedCache && cachedVisitorToken === null) {
            void readSupportVisitorToken().then(stored => {
                hydratedCache = true;
                if (stored && !cachedVisitorToken) {
                    publishVisitorToken(stored);
                }
                setHydrated(true);
            });
        }
        return () => {
            tokenListeners.delete(listener);
        };
    }, []);

    useEffect(() => {
        realtimeWs.syncAccessToken(sessionStore.read()?.accessToken ?? null);
    }, [user?.id]);

    useEffect(() => {
        if (hydrated) {
            realtimeWs.setVisitorToken(visitorToken);
        }
    }, [hydrated, visitorToken]);

    const resetSession = useCallback(async () => {
        const prev = cachedVisitorToken;
        clearAdminTypingTimer();
        clearVisitorStopTimer();
        visitorTypingThrottleRef.current = 0;
        setAdminTyping(false);
        publishVisitorToken(null);
        realtimeWs.setVisitorToken(null);
        await clearSupportVisitorToken();
        if (prev) {
            queryClient.removeQueries({queryKey: supportKeys.publicSession(prev)});
        }
    }, [clearAdminTypingTimer, clearVisitorStopTimer, queryClient]);

    useEffect(() => {
        if (!hydrated || (!visitorToken && !user?.id)) return;

        const unsubStatus = realtimeWs.subscribeStatus(setWsConnected);
        const unsubFrames = realtimeWs.subscribe(frame => {
            if (frame.type === 'SUPPORT_THREAD_UPDATED') {
                const updated = frame.session;
                if (!visitorToken || updated.visitorToken !== visitorToken) return;
                clearAdminTypingTimer();
                setAdminTyping(false);
                const viewSession = markRead ? {...updated, unreadForVisitor: 0} : updated;
                queryClient.setQueryData(supportKeys.publicSession(visitorToken), viewSession);
                queryClient.setQueryData([...supportKeys.publicSession(visitorToken), 'read'], viewSession);
                queryClient.setQueryData([...supportKeys.publicSession(visitorToken), 'peek'], viewSession);
                if (markRead && updated.unreadForVisitor > 0) {
                    void mobileSupportService.getPublicThread(visitorToken, true).catch(() => undefined);
                }
                return;
            }

            if (frame.type === 'SUPPORT_ADMIN_TYPING') {
                if (!visitorToken) return;
                const current =
                    queryClient.getQueryData<PublicSupportThreadSession>(supportKeys.publicSession(visitorToken)) ??
                    queryClient.getQueryData<PublicSupportThreadSession>([
                        ...supportKeys.publicSession(visitorToken),
                        markRead ? 'read' : 'peek',
                    ]);
                if (current && frame.threadId !== current.threadId) return;
                clearAdminTypingTimer();
                if (frame.typing) {
                    setAdminTyping(true);
                    adminTypingTimerRef.current = setTimeout(() => {
                        adminTypingTimerRef.current = null;
                        setAdminTyping(false);
                    }, ADMIN_TYPING_TIMEOUT_MS);
                } else {
                    setAdminTyping(false);
                }
                return;
            }

            if (frame.type === 'SUPPORT_THREAD_DELETED') {
                if (!visitorToken) return;
                const current =
                    queryClient.getQueryData<PublicSupportThreadSession>(supportKeys.publicSession(visitorToken)) ??
                    queryClient.getQueryData<PublicSupportThreadSession>([
                        ...supportKeys.publicSession(visitorToken),
                        markRead ? 'read' : 'peek',
                    ]);
                if (current && current.threadId === frame.threadId) {
                    void resetSession();
                }
            }
        });

        return () => {
            unsubFrames();
            unsubStatus();
            clearAdminTypingTimer();
        };
    }, [clearAdminTypingTimer, hydrated, markRead, queryClient, resetSession, user?.id, visitorToken]);

    useEffect(() => clearVisitorStopTimer, [clearVisitorStopTimer]);

    const notifyVisitorTyping = useCallback(
        (typing: boolean) => {
            if (!visitorToken) return;
            clearVisitorStopTimer();
            if (!typing) {
                visitorTypingThrottleRef.current = 0;
                realtimeWs.sendVisitorTyping(visitorToken, false);
                return;
            }
            const now = Date.now();
            if (now - visitorTypingThrottleRef.current >= VISITOR_TYPING_THROTTLE_MS) {
                visitorTypingThrottleRef.current = now;
                realtimeWs.sendVisitorTyping(visitorToken, true);
            }
            visitorStopTimerRef.current = setTimeout(() => {
                visitorTypingThrottleRef.current = 0;
                visitorStopTimerRef.current = null;
                realtimeWs.sendVisitorTyping(visitorToken, false);
            }, VISITOR_TYPING_IDLE_MS);
        },
        [clearVisitorStopTimer, visitorToken],
    );

    const sessionQuery = useQuery({
        queryKey: [...supportKeys.publicSession(visitorToken), markRead ? 'read' : 'peek'],
        queryFn: async ({signal}) => {
            if (!visitorToken) return null;
            try {
                const session = await mobileSupportService.getPublicThread(visitorToken, markRead, signal);
                queryClient.setQueryData(supportKeys.publicSession(visitorToken), session);
                if (markRead) {
                    queryClient.setQueryData([...supportKeys.publicSession(visitorToken), 'peek'], session);
                }
                return session;
            } catch (err) {
                if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
                    await resetSession();
                    return null;
                }
                throw err;
            }
        },
        enabled: hydrated && Boolean(visitorToken),
        refetchInterval: visitorToken ? (wsConnected ? 30_000 : 5_000) : false,
    });

    const startThread = useMutation({
        mutationFn: (payload: PublicSupportCreateInput) => mobileSupportService.createPublicThread(payload),
        onSuccess: async (created: PublicSupportThreadSession) => {
            await writeSupportVisitorToken(created.visitorToken);
            publishVisitorToken(created.visitorToken);
            realtimeWs.setVisitorToken(created.visitorToken);
            queryClient.setQueryData(supportKeys.publicSession(created.visitorToken), created);
            queryClient.setQueryData([...supportKeys.publicSession(created.visitorToken), 'read'], created);
            queryClient.setQueryData([...supportKeys.publicSession(created.visitorToken), 'peek'], created);
        },
    });

    const sendMessage = useMutation({
        mutationFn: (content: string) => {
            if (!visitorToken) throw new Error('Missing support visitor token');
            return mobileSupportService.sendPublicMessage(visitorToken, content);
        },
        onSuccess: (updated: PublicSupportThreadSession) => {
            queryClient.setQueryData(supportKeys.publicSession(updated.visitorToken), updated);
            queryClient.setQueryData([...supportKeys.publicSession(updated.visitorToken), 'read'], updated);
            queryClient.setQueryData([...supportKeys.publicSession(updated.visitorToken), 'peek'], updated);
        },
    });

    return {
        hydrated,
        visitorToken,
        session: sessionQuery.data ?? null,
        unreadCount: sessionQuery.data?.unreadForVisitor ?? 0,
        wsConnected,
        adminTyping,
        notifyVisitorTyping,
        isLoading: sessionQuery.isLoading,
        isFetching: sessionQuery.isFetching,
        refetch: sessionQuery.refetch,
        startThread,
        sendMessage,
        resetSession,
    };
}
