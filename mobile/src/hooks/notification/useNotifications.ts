import {Platform} from 'react-native';
import Constants from 'expo-constants';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import {notificationsService} from '@/api/notification/notifications.api';
import {readSavedPushEndpoint, savePushEndpoint} from '@/lib/storage/preferences';
import {useAuth} from '@/providers/AuthContext';

// Active field polling + Expo Push HTTP registration when a push endpoint is enrolled for this device.
const POLL_MS = 30_000;

function defaultDevicePushEndpoint(userId?: number): string {
    const rawSession = (Constants.sessionId ?? 'mobile').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'device';
    return `ExponentPushToken[uav-${Platform.OS}-${userId ?? 0}-${rawSession}]`;
}

export function useNotifications() {
    const {user} = useAuth();
    const client = useQueryClient();
    const key = queryKeys.feature(user?.id, 'notifications');

    const list = useQuery({
        queryKey: [...key, 'recent'],
        queryFn: async ({signal}) => (await notificationsService.recent(50, signal)).content,
        enabled: !!user,
        refetchInterval: POLL_MS,
    });

    const unread = useQuery({
        queryKey: [...key, 'unread'],
        queryFn: ({signal}) => notificationsService.unreadCount(signal),
        enabled: !!user,
        refetchInterval: POLL_MS,
    });

    const pushEndpointQuery = useQuery({
        queryKey: [...key, 'push-endpoint'],
        queryFn: () => readSavedPushEndpoint(),
        enabled: !!user,
    });

    const refresh = () => client.invalidateQueries({queryKey: key});

    const markOne = useMutation({
        mutationFn: (id: number) => notificationsService.markRead(id),
        onSuccess: refresh,
    });

    const markAll = useMutation({
        mutationFn: () => notificationsService.markAllRead(),
        onSuccess: refresh,
    });

    const registerPushDevice = useMutation({
        mutationFn: async (input?: { endpoint?: string; deviceName?: string }) => {
            const endpoint = input?.endpoint?.trim() || defaultDevicePushEndpoint(user?.id);
            const platform: 'IOS' | 'ANDROID' = Platform.OS === 'android' ? 'ANDROID' : 'IOS';
            const deviceName =
                input?.deviceName?.trim() ||
                Constants.deviceName ||
                (Platform.OS === 'android' ? 'Android Field Device' : 'iPhone Field Device');
            const appVersion = Constants.expoConfig?.version;
            const record = await notificationsService.registerPushEndpoint({
                token: endpoint,
                platform,
                deviceName,
                appVersion,
            });
            await savePushEndpoint(record.token || endpoint);
            return record;
        },
        onSuccess: () => client.invalidateQueries({queryKey: [...key, 'push-endpoint']}),
        retry: false,
    });

    const unregisterPushDevice = useMutation({
        mutationFn: async (explicitEndpoint?: string) => {
            const current = explicitEndpoint?.trim() || (await readSavedPushEndpoint());
            if (current) {
                await notificationsService.unregisterPushEndpoint(current);
            }
            await savePushEndpoint(null);
        },
        onSuccess: () => client.invalidateQueries({queryKey: [...key, 'push-endpoint']}),
        retry: false,
    });

    return {
        list,
        unreadCount: unread.data?.unreadCount ?? 0,
        markOne,
        markAll,
        refresh,
        savedPushEndpoint: pushEndpointQuery.data ?? null,
        registerPushDevice,
        unregisterPushDevice,
    };
}
