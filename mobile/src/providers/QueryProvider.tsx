import React, {ReactNode, useEffect, useState} from 'react';
import {AppState, Platform} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {focusManager, onlineManager, QueryClientProvider} from '@tanstack/react-query';
import {createQueryClient} from '@/shared/lib/query';

// React Query knows browser focus and online events; on a phone those are AppState and NetInfo. Returning to the app
// refreshes stale data, a locked screen pauses polling, and requests wait while there is no connection.
onlineManager.setEventListener(setOnline => NetInfo.addEventListener(state => setOnline(!!state.isConnected)));

export function QueryProvider({children}: { children: ReactNode }) {
    const [client] = useState(() => {
        const queryClient = createQueryClient();
        // Same defaults as the web, except that coming back to the app (rare, unlike tab focus) refreshes stale data.
        const defaults = queryClient.getDefaultOptions();
        queryClient.setDefaultOptions({...defaults, queries: {...defaults.queries, refetchOnWindowFocus: true}});
        return queryClient;
    });

    useEffect(() => {
        if (Platform.OS === 'web') return;
        const subscription = AppState.addEventListener('change', status => focusManager.setFocused(status === 'active'));
        return () => subscription.remove();
    }, []);

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
