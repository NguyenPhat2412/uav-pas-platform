import {useEffect, useState} from 'react';
import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';

function computeOffline(state: NetInfoState): boolean {
    return state.isConnected === false || state.isInternetReachable === false;
}

/** Reactive field network status driven by native NetInfo reachability events. */
export function useNetworkStatus(): { isOffline: boolean } {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        let mounted = true;
        void NetInfo.fetch().then(state => {
            if (mounted) setIsOffline(computeOffline(state));
        });
        const unsubscribe = NetInfo.addEventListener(state => {
            if (mounted) setIsOffline(computeOffline(state));
        });
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    return {isOffline};
}
