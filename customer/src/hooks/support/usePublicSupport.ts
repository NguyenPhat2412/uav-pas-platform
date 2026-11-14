'use client';

import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {ApiError} from '@/lib/api';
import {
    acquireRealtimeConnection,
    getRealtimeStatus,
    sendVisitorTyping,
    subscribeRealtimeEvents,
    subscribeRealtimeStatus,
} from '@/lib/realtime-ws';
import {profileService} from '@/api/profile/profile.api';
import {fetchPublicSiteInfo} from '@/api/settings/platform-settings.api';
import {publicSupportService} from '@/api/support/support.api';
import {profileKeys} from '@/hooks/profile/query-keys';
import {useAuth} from '@/providers/AuthContext';
import type {
    OpenSupportWidgetDetail,
    PublicDiscoveryData,
    PublicSupportCreateInput,
    PublicSupportThreadSession,
    SupportAdminTypingState,
    SupportSessionEventDetail,
} from '@/types/support/support.types';

export const PUBLIC_SUPPORT_TOKEN_KEY = 'uav_public_support_token';
export const OPEN_SUPPORT_WIDGET_EVENT = 'uav:open-support';
export const SUPPORT_SESSION_EVENT = 'uav:support-session';

const PUBLIC_SITE_INFO_QUERY_KEY = ['public-site-info'] as const;
const PUBLIC_DISCOVERY_QUERY_KEY = ['public-discovery'] as const;
const supportThreadKey = (visitorToken: string | null) => ['public-support-thread', visitorToken] as const;

const ADMIN_TYPING_TIMEOUT_MS = 5_000;
const VISITOR_TYPING_IDLE_MS = 2_000;
const VISITOR_TYPING_THROTTLE_MS = 1_500;
const IDLE_ADMIN_TYPING: SupportAdminTypingState = {isTyping: false, senderName: null};
const getServerRealtimeStatus = () => 'disconnected' as const;

export function readStoredSupportToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const value = window.localStorage.getItem(PUBLIC_SUPPORT_TOKEN_KEY)?.trim();
        return value || null;
    } catch {
        return null;
    }
}

export function saveStoredSupportToken(
    visitorToken: string | null,
    options: {open?: boolean; broadcast?: boolean} = {},
): void {
    if (typeof window === 'undefined') return;
    const normalized = visitorToken?.trim() || null;
    try {
        if (normalized) {
            window.localStorage.setItem(PUBLIC_SUPPORT_TOKEN_KEY, normalized);
        } else {
            window.localStorage.removeItem(PUBLIC_SUPPORT_TOKEN_KEY);
        }
    } catch {
        // Ignore storage errors in restricted browsing modes.
    }
    if (options.broadcast !== false && typeof CustomEvent !== 'undefined') {
        const detail: SupportSessionEventDetail = {
            visitorToken: normalized,
            open: options.open,
        };
        window.dispatchEvent(new CustomEvent<SupportSessionEventDetail>(SUPPORT_SESSION_EVENT, {detail}));
    }
}

export function openPublicSupportWidget(detail: OpenSupportWidgetDetail = {}): void {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
    window.dispatchEvent(new CustomEvent<OpenSupportWidgetDetail>(OPEN_SUPPORT_WIDGET_EVENT, {detail}));
}

export function getSupportErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.fields) {
            const firstFieldMessage = Object.values(error.fields).find(Boolean);
            if (firstFieldMessage) return firstFieldMessage;
        }
        if (error.status === 0) {
            return 'Không thể kết nối máy chủ hỗ trợ. Vui lòng kiểm tra kết nối mạng và thử lại.';
        }
        if (error.message) return error.message;
    }
    return 'Không thể gửi tin nhắn lúc này. Vui lòng thử lại sau giây lát.';
}

export function usePublicSiteInfo() {
    const query = useQuery({
        queryKey: PUBLIC_SITE_INFO_QUERY_KEY,
        queryFn: ({signal}) => fetchPublicSiteInfo(signal),
        staleTime: 60_000,
    });

    const envHotline = process.env.NEXT_PUBLIC_DISPATCH_HOTLINE?.trim() || undefined;
    const envZalo = process.env.NEXT_PUBLIC_ZALO_PHONE?.trim() || undefined;
    return {
        ...query,
        dispatchHotline: query.data?.dispatchHotline?.trim() || envHotline,
        zaloPhone: query.data?.zaloPhone?.trim() || envZalo,
        email: query.data?.email?.trim() || undefined,
        address: query.data?.address?.trim() || undefined,
        settings: query.data?.settings ?? {},
    };
}

export function usePublicDiscovery(enabled = true) {
    return useQuery<PublicDiscoveryData>({
        queryKey: PUBLIC_DISCOVERY_QUERY_KEY,
        queryFn: ({signal}) => publicSupportService.discovery(signal),
        enabled,
        staleTime: 60_000,
    });
}

export function useSupportVisitorPrefill(portalMode: boolean, isOpen: boolean) {
    const {user} = useAuth();
    const fetchPortalDetails = Boolean(user) && portalMode;
    const ownProfile = useQuery({
        queryKey: profileKeys.own(user?.id),
        enabled: fetchPortalDetails,
        staleTime: 60_000,
        queryFn: ({signal}) => profileService.get(signal),
    });
    const billingProfile = useQuery({
        queryKey: profileKeys.billing(user?.id),
        enabled: fetchPortalDetails && isOpen,
        staleTime: 60_000,
        retry: false,
        queryFn: ({signal}) => profileService.getBilling(signal),
    });

    return {
        fullName: ownProfile.data?.fullName?.trim() || user?.fullName?.trim() || user?.username?.trim() || '',
        contactInfo: user?.email?.trim() || ownProfile.data?.phoneNumber?.trim() || user?.phoneNumber?.trim() || '',
        organization: billingProfile.data?.organizationName?.trim() || '',
    };
}

export function usePublicSupportSession(visitorToken: string | null, isOpen: boolean, authenticatedPortal = false) {
    const queryClient = useQueryClient();
    const isOpenRef = useRef(isOpen);
    const tokenRef = useRef(visitorToken);
    const realtimeStatus = useSyncExternalStore(
        subscribeRealtimeStatus,
        getRealtimeStatus,
        getServerRealtimeStatus,
    );
    const [adminTyping, setAdminTyping] = useState<SupportAdminTypingState>(IDLE_ADMIN_TYPING);
    const adminTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const visitorTypingRef = useRef<{
        active: boolean;
        lastSentAt: number;
        idleTimer: ReturnType<typeof setTimeout> | null;
    }>({active: false, lastSentAt: 0, idleTimer: null});

    useEffect(() => {
        tokenRef.current = visitorToken;
    }, [visitorToken]);

    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen && visitorToken) {
            const cached = queryClient.getQueryData<PublicSupportThreadSession | null>(supportThreadKey(visitorToken));
            if (!cached || cached.unreadForVisitor > 0) {
                void queryClient.invalidateQueries({queryKey: supportThreadKey(visitorToken)});
            }
        }
    }, [isOpen, queryClient, visitorToken]);

    useEffect(() => {
        const shouldConnect = Boolean(visitorToken) || (authenticatedPortal && isOpen);
        if (!shouldConnect) return;

        const release = acquireRealtimeConnection({
            visitorToken,
            authenticated: authenticatedPortal,
        });

        const clearAdminTypingTimer = () => {
            if (adminTypingTimerRef.current !== null) {
                clearTimeout(adminTypingTimerRef.current);
                adminTypingTimerRef.current = null;
            }
        };

        const unsubscribeEvents = subscribeRealtimeEvents((frame) => {
            if (!visitorToken) return;

            if (frame.type === 'SUPPORT_THREAD_UPDATED') {
                if (frame.session.visitorToken !== visitorToken) return;
                clearAdminTypingTimer();
                setAdminTyping(IDLE_ADMIN_TYPING);

                if (isOpenRef.current && frame.session.unreadForVisitor > 0) {
                    queryClient.setQueryData<PublicSupportThreadSession>(
                        supportThreadKey(visitorToken),
                        {...frame.session, unreadForVisitor: 0},
                    );
                    void publicSupportService
                        .getThread(visitorToken, true)
                        .then((marked) => {
                            if (tokenRef.current === visitorToken) {
                                queryClient.setQueryData(supportThreadKey(visitorToken), marked);
                            }
                        })
                        .catch(() => {
                            // Keep optimistic session state if markRead fails transiently.
                        });
                } else {
                    queryClient.setQueryData(supportThreadKey(visitorToken), frame.session);
                }
                return;
            }

            if (frame.type === 'SUPPORT_ADMIN_TYPING') {
                const cached = queryClient.getQueryData<PublicSupportThreadSession | null>(supportThreadKey(visitorToken));
                if (cached && cached.threadId !== frame.threadId) return;
                clearAdminTypingTimer();
                if (frame.typing) {
                    setAdminTyping({
                        isTyping: true,
                        senderName: frame.senderName?.trim() || 'Quản trị viên',
                    });
                    adminTypingTimerRef.current = setTimeout(() => {
                        adminTypingTimerRef.current = null;
                        setAdminTyping(IDLE_ADMIN_TYPING);
                    }, ADMIN_TYPING_TIMEOUT_MS);
                } else {
                    setAdminTyping(IDLE_ADMIN_TYPING);
                }
                return;
            }

            if (frame.type === 'SUPPORT_THREAD_DELETED') {
                const cached = queryClient.getQueryData<PublicSupportThreadSession | null>(supportThreadKey(visitorToken));
                if (!cached || cached.threadId === frame.threadId) {
                    clearAdminTypingTimer();
                    setAdminTyping(IDLE_ADMIN_TYPING);
                    queryClient.setQueryData(supportThreadKey(visitorToken), null);
                    saveStoredSupportToken(null, {broadcast: true});
                }
            }
        });

        const typingState = visitorTypingRef.current;
        return () => {
            clearAdminTypingTimer();
            if (typingState.idleTimer !== null) {
                clearTimeout(typingState.idleTimer);
                typingState.idleTimer = null;
            }
            if (typingState.active && visitorToken) {
                typingState.active = false;
                typingState.lastSentAt = 0;
                sendVisitorTyping(visitorToken, false);
            }
            unsubscribeEvents();
            release();
        };
    }, [authenticatedPortal, isOpen, queryClient, visitorToken]);

    const notifyVisitorTyping = useCallback(
        (typing: boolean) => {
            if (!visitorToken) return;
            const state = visitorTypingRef.current;

            if (!typing) {
                if (state.idleTimer !== null) {
                    clearTimeout(state.idleTimer);
                    state.idleTimer = null;
                }
                if (state.active) {
                    state.active = false;
                    state.lastSentAt = 0;
                    sendVisitorTyping(visitorToken, false);
                }
                return;
            }

            if (state.idleTimer !== null) clearTimeout(state.idleTimer);
            state.idleTimer = setTimeout(() => {
                state.idleTimer = null;
                if (state.active && tokenRef.current) {
                    state.active = false;
                    state.lastSentAt = 0;
                    sendVisitorTyping(tokenRef.current, false);
                }
            }, VISITOR_TYPING_IDLE_MS);

            const now = Date.now();
            if (!state.active || now - state.lastSentAt >= VISITOR_TYPING_THROTTLE_MS) {
                state.active = true;
                state.lastSentAt = now;
                sendVisitorTyping(visitorToken, true);
            }
        },
        [visitorToken],
    );

    const wsConnected = realtimeStatus === 'connected' && (Boolean(visitorToken) || (authenticatedPortal && isOpen));

    const query = useQuery<PublicSupportThreadSession | null>({
        queryKey: supportThreadKey(visitorToken),
        enabled: Boolean(visitorToken),
        refetchInterval: wsConnected ? 30_000 : isOpen ? 5_000 : 12_000,
        retry: (failureCount, error) =>
            !(error instanceof ApiError && error.status === 404) && failureCount < 2,
        queryFn: async ({signal}) => {
            if (!visitorToken) return null;
            try {
                return await publicSupportService.getThread(visitorToken, isOpenRef.current, signal);
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) {
                    saveStoredSupportToken(null, {broadcast: true});
                    return null;
                }
                throw error;
            }
        },
    });

    return {
        ...query,
        wsConnected,
        adminTyping: visitorToken ? adminTyping : IDLE_ADMIN_TYPING,
        notifyVisitorTyping,
    };
}

export function useCreatePublicSupportThread() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: PublicSupportCreateInput) => publicSupportService.createThread(payload),
        onSuccess: (session) => {
            queryClient.setQueryData(supportThreadKey(session.visitorToken), session);
        },
    });
}

export function useSendPublicSupportMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({visitorToken, content}: {visitorToken: string; content: string}) =>
            publicSupportService.sendMessage(visitorToken, content),
        onSuccess: (session) => {
            queryClient.setQueryData(supportThreadKey(session.visitorToken), session);
        },
    });
}
