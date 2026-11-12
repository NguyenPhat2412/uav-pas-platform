import {useCallback, useEffect, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {ApiError} from '@/lib/api/client';
import {
    clearSupportVisitorToken,
    readSupportVisitorToken,
    writeSupportVisitorToken,
} from '@/lib/storage/secure-tokens';
import {mobileSupportService} from '@/api/support/support.api';
import {supportKeys} from '@/shared/hooks/support/query-keys';
import type {
    PublicSupportCreateInput,
    PublicSupportThreadSession,
} from '@/shared/types/support/support.types';

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
    const [visitorToken, setVisitorToken] = useState<string | null>(cachedVisitorToken);
    const [hydrated, setHydrated] = useState<boolean>(() => hydratedCache || cachedVisitorToken !== null);

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

    const resetSession = useCallback(async () => {
        const prev = cachedVisitorToken;
        publishVisitorToken(null);
        await clearSupportVisitorToken();
        if (prev) {
            queryClient.removeQueries({queryKey: supportKeys.publicSession(prev)});
        }
    }, [queryClient]);

    const sessionQuery = useQuery({
        queryKey: [...supportKeys.publicSession(visitorToken), markRead ? 'read' : 'peek'],
        queryFn: async ({signal}) => {
            if (!visitorToken) return null;
            try {
                const session = await mobileSupportService.getPublicThread(visitorToken, markRead, signal);
                queryClient.setQueryData(supportKeys.publicSession(visitorToken), session);
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
        refetchInterval: visitorToken ? (markRead ? 4_500 : 10_000) : false,
    });

    const startThread = useMutation({
        mutationFn: (payload: PublicSupportCreateInput) => mobileSupportService.createPublicThread(payload),
        onSuccess: async (created: PublicSupportThreadSession) => {
            await writeSupportVisitorToken(created.visitorToken);
            publishVisitorToken(created.visitorToken);
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
            queryClient.setQueryData([...supportKeys.publicSession(updated.visitorToken), 'read'], updated);
            queryClient.setQueryData([...supportKeys.publicSession(updated.visitorToken), 'peek'], updated);
        },
    });

    return {
        hydrated,
        visitorToken,
        session: sessionQuery.data ?? null,
        unreadCount: sessionQuery.data?.unreadForVisitor ?? 0,
        isLoading: sessionQuery.isLoading,
        isFetching: sessionQuery.isFetching,
        refetch: sessionQuery.refetch,
        startThread,
        sendMessage,
        resetSession,
    };
}
