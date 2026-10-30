'use client';

import {MutationCache, QueryCache, QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ReactNode, useEffect, useState} from 'react';
import {toast} from '@/providers/ToastContext';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/providers/I18nContext';

import type {Translate} from '@/types';
// The query client is created once, so its cache callbacks read the active translator from here.
const translator: { current: Translate } = {current: key => key};

export function QueryProvider({children}: { children: ReactNode }) {
    const {t} = useI18n();
    useEffect(() => {
        translator.current = t;
    }, [t]);
    const [queryClient] = useState(() => new QueryClient({
        queryCache: new QueryCache({
            onError: (error, query) => {
                if (query.meta?.suppressToast) return;
                if (error instanceof ApiError) {
                    if (error.status === 401 || error.status === 403) return; // Handled by auth guards
                    if (error.status >= 500) {
                        toast.error(error.message || translator.current('opsShared.query.serverError'), translator.current('opsShared.query.serverErrorTitle'));
                        return;
                    }
                    if (error.code === 'NETWORK_ERROR') {
                        toast.error(translator.current('opsShared.query.networkError'), translator.current('opsShared.query.networkErrorTitle'));
                        return;
                    }
                }
            }
        }),
        mutationCache: new MutationCache({
            onError: (error, _variables, _context, mutation) => {
                if (mutation.meta?.suppressToast) return;
                const message = error instanceof Error ? error.message : translator.current('opsShared.query.mutationFailed');
                toast.error(message, translator.current('opsShared.query.mutationErrorTitle'));
            }
        }),
        defaultOptions: {
            queries: {staleTime: 15_000, refetchOnWindowFocus: true, retry: false},
            mutations: {retry: false}
        },
    }));
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
