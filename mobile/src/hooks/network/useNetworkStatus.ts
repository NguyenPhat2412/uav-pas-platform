import {useCallback, useEffect, useState} from 'react';
import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {useQueryClient} from '@tanstack/react-query';
import {mobileSupportService} from '@/api/support/support.api';
import {ApiError, onTransportStatus} from '@/lib/api/client';

export type OfflineReason = 'network' | 'server' | 'maintenance';

interface NetworkStore {
    isOffline: boolean;
    reason: OfflineReason;
    netDisconnected: boolean;
    dismissed: boolean;
    checking: boolean;
    initialized: boolean;
    listeners: Set<() => void>;
}

const sharedStore = globalThis as { __uavNetworkStore?: NetworkStore };
const store: NetworkStore = (sharedStore.__uavNetworkStore ??= {
    isOffline: false,
    reason: 'network',
    netDisconnected: false,
    dismissed: false,
    checking: false,
    initialized: false,
    listeners: new Set(),
});

function emit() {
    store.listeners.forEach(listener => listener());
}

async function probeBackend(timeoutMs = 2500): Promise<'online' | 'server' | 'maintenance'> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        await mobileSupportService.siteInfo(controller.signal);
        return 'online';
    } catch (error) {
        if (error instanceof ApiError && (error.status === 502 || error.status === 503 || error.status === 504)) {
            return 'maintenance';
        }
        if (error instanceof ApiError && error.status > 0 && error.status < 502) {
            return 'online';
        }
        return 'server';
    } finally {
        clearTimeout(timer);
    }
}

async function applyNetInfoState(state: NetInfoState) {
    if (state.isConnected === false) {
        store.netDisconnected = true;
        store.reason = 'network';
        if (!store.isOffline) {
            store.isOffline = true;
            emit();
        }
        return;
    }
    store.netDisconnected = false;
    if (state.isInternetReachable === false) {
        const probe = await probeBackend();
        if (probe !== 'online') {
            store.reason = probe === 'maintenance' ? 'maintenance' : 'network';
            store.isOffline = true;
            emit();
            return;
        }
    }
    if (store.isOffline && store.reason === 'network') {
        store.isOffline = false;
        store.dismissed = false;
        emit();
    }
}

function ensureSubscribed() {
    if (store.initialized) return;
    store.initialized = true;
    void NetInfo.fetch().then(applyNetInfoState);
    NetInfo.addEventListener(state => {
        void applyNetInfoState(state);
    });
    onTransportStatus(signal => {
        if (signal === 'online') {
            if (store.isOffline && !store.netDisconnected) {
                store.isOffline = false;
                store.dismissed = false;
                emit();
            }
        } else {
            const nextReason: OfflineReason = store.netDisconnected
                ? 'network'
                : signal === 'maintenance'
                    ? 'maintenance'
                    : 'server';
            if (!store.isOffline || store.reason !== nextReason) {
                store.reason = nextReason;
                store.isOffline = true;
                emit();
            }
        }
    });
}

export interface NetworkStatusValue {
    isOffline: boolean;
    reason: OfflineReason;
    dismissed: boolean;
    checking: boolean;
    recheck: () => Promise<boolean>;
    dismiss: () => void;
    reopen: () => void;
}

/** Reactive field network status driven by native NetInfo reachability events + live API transport status. */
export function useNetworkStatus(): NetworkStatusValue {
    const [, forceRender] = useState(0);
    const queryClient = useQueryClient();

    useEffect(() => {
        ensureSubscribed();
        const listener = () => forceRender(tick => tick + 1);
        store.listeners.add(listener);
        return () => {
            store.listeners.delete(listener);
        };
    }, []);

    const recheck = useCallback(async (): Promise<boolean> => {
        store.checking = true;
        emit();
        try {
            const state = await NetInfo.fetch();
            if (state.isConnected === false) {
                store.netDisconnected = true;
                store.reason = 'network';
                store.isOffline = true;
                return false;
            }
            store.netDisconnected = false;
            const probe = await probeBackend(3000);
            if (probe === 'online') {
                store.isOffline = false;
                store.dismissed = false;
                void queryClient.invalidateQueries();
                return true;
            }
            store.reason = probe === 'maintenance' ? 'maintenance' : state.isInternetReachable === false ? 'network' : 'server';
            store.isOffline = true;
            return false;
        } finally {
            store.checking = false;
            emit();
        }
    }, [queryClient]);

    const dismiss = useCallback(() => {
        store.dismissed = true;
        emit();
    }, []);

    const reopen = useCallback(() => {
        store.dismissed = false;
        emit();
    }, []);

    return {
        isOffline: store.isOffline,
        reason: store.reason,
        dismissed: store.dismissed,
        checking: store.checking,
        recheck,
        dismiss,
        reopen,
    };
}
