'use client';

import {useEffect, useRef} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {ApiError} from '@/lib/api';
import {fetchPublicSiteInfo} from '@/api/settings/platform-settings.api';
import {publicSupportService} from '@/api/support/support.api';
import type {
    OpenSupportWidgetDetail,
    PublicDiscoveryData,
    PublicSupportCreateInput,
    PublicSupportThreadSession,
    SupportSessionEventDetail,
} from '@/types/support/support.types';

export const PUBLIC_SUPPORT_TOKEN_KEY = 'uav_public_support_token';
export const OPEN_SUPPORT_WIDGET_EVENT = 'uav:open-support';
export const SUPPORT_SESSION_EVENT = 'uav:support-session';

const PUBLIC_SITE_INFO_QUERY_KEY = ['public-site-info'] as const;
const PUBLIC_DISCOVERY_QUERY_KEY = ['public-discovery'] as const;
const supportThreadKey = (visitorToken: string | null) => ['public-support-thread', visitorToken] as const;

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

export function usePublicSupportSession(visitorToken: string | null, isOpen: boolean) {
    const queryClient = useQueryClient();
    const isOpenRef = useRef(isOpen);

    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen && visitorToken) {
            void queryClient.invalidateQueries({queryKey: supportThreadKey(visitorToken)});
        }
    }, [isOpen, queryClient, visitorToken]);

    return useQuery<PublicSupportThreadSession | null>({
        queryKey: supportThreadKey(visitorToken),
        enabled: Boolean(visitorToken),
        refetchInterval: isOpen ? 4_000 : 10_000,
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
