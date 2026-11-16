import {useEffect} from 'react';
import {Platform} from 'react-native';
import Constants from 'expo-constants';
import {requireOptionalNativeModule} from 'expo-modules-core';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import {notificationsService} from '@/api/notification/notifications.api';
import {readSavedPushEndpoint, savePushEndpoint} from '@/lib/storage/preferences';
import {sessionStore} from '@/lib/api/session';
import {realtimeWs} from '@/lib/realtime/realtime-ws';
import {useAuth} from '@/providers/AuthContext';
import type {
    NotificationModuleCode,
    RealtimeNotificationPopupPayload,
    UpdateUserNotificationPreferenceInput,
} from '@/shared/types/notification/notification.types';

const POLL_MS = 30_000;

interface NativePermissionResponse {
    status?: string;
    granted?: boolean;
    ios?: { status?: number };
}

interface NativePushPermissionsModule {
    getPermissionsAsync?: () => Promise<NativePermissionResponse>;
    requestPermissionsAsync?: (options?: Record<string, unknown>) => Promise<NativePermissionResponse>;
}

type NotificationsModule = typeof import('expo-notifications');

let foregroundHandlerConfigured = false;

function loadNotifications(): NotificationsModule | null {
    if (Platform.OS === 'web') return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('expo-notifications') as NotificationsModule;
        if (!foregroundHandlerConfigured && typeof mod.setNotificationHandler === 'function') {
            foregroundHandlerConfigured = true;
            mod.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });
        }
        return mod;
    } catch {
        return null;
    }
}

function isPushPermissionGranted(perm: NativePermissionResponse | null | undefined): boolean {
    if (!perm) return false;
    if (perm.granted === true || perm.status === 'granted') return true;
    return perm.ios?.status === 2 || perm.ios?.status === 3 || perm.ios?.status === 4;
}

function defaultDevicePushEndpoint(userId?: number): string {
    const rawSession = (Constants.sessionId ?? 'mobile').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'device';
    return `ExponentPushToken[uav-${Platform.OS}-${userId ?? 0}-${rawSession}]`;
}

async function resolveDevicePushEndpoint(userId?: number): Promise<string> {
    const permissionsModule = requireOptionalNativeModule<NativePushPermissionsModule>('ExpoNotificationPermissionsModule');
    if (permissionsModule?.requestPermissionsAsync) {
        const current = permissionsModule.getPermissionsAsync ? await permissionsModule.getPermissionsAsync() : null;
        const resolved = isPushPermissionGranted(current)
            ? current
            : await permissionsModule.requestPermissionsAsync({
                  ios: {allowAlert: true, allowBadge: true, allowSound: true},
              });
        if (!isPushPermissionGranted(resolved)) {
            throw Object.assign(new Error('PUSH_PERMISSION_DENIED'), {code: 'PUSH_PERMISSION_DENIED'});
        }
    }

    const notifications = loadNotifications();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (notifications && projectId) {
        try {
            const {data} = await notifications.getExpoPushTokenAsync({projectId});
            if (data?.trim()) return data.trim().slice(0, 255);
        } catch {
            // Simulator or a build without aps-environment entitlement: fall back cleanly.
        }
    }

    return defaultDevicePushEndpoint(userId);
}

export interface MobileIncomingNotificationEvent {
    notification: RealtimeNotificationPopupPayload;
    screenPopup: boolean;
}

export function useRealtimeMobileNotifications(
    onIncoming?: (event: MobileIncomingNotificationEvent) => void,
) {
    const {user} = useAuth();
    const client = useQueryClient();
    const userId = user?.id;

    useEffect(() => {
        loadNotifications();
        if (userId == null) return;
        const feature = queryKeys.feature(userId, 'notifications');
        realtimeWs.syncAccessToken(sessionStore.read()?.accessToken ?? null);
        return realtimeWs.subscribe(frame => {
            if (frame.type !== 'NOTIFICATION_CREATED') return;
            client.setQueryData([...feature, 'unread'], {unreadCount: frame.unreadCount});
            void client.invalidateQueries({queryKey: [...feature, 'recent']});
            void client.invalidateQueries({
                predicate: q =>
                    (q.queryKey[0] === 'session' &&
                        q.queryKey[1] === userId &&
                        q.queryKey[2] !== 'notifications') ||
                    q.queryKey[0] === 'marketplace' ||
                    q.queryKey[0] === 'public',
            });
            if (onIncoming && frame.notification) {
                onIncoming({
                    notification: frame.notification,
                    screenPopup: frame.screenPopup !== false,
                });
            }
        });
    }, [userId, client, onIncoming]);
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

    useRealtimeMobileNotifications();

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
            const endpoint = input?.endpoint?.trim() || (await resolveDevicePushEndpoint(user?.id));
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
            await savePushEndpoint(endpoint);
            return record;
        },
        onSuccess: refresh,
    });

    const unregisterPushDevice = useMutation({
        mutationFn: async () => {
            const current = await readSavedPushEndpoint();
            if (current) {
                try {
                    await notificationsService.unregisterPushEndpoint(current);
                } finally {
                    await savePushEndpoint(null);
                }
            }
        },
        onSuccess: refresh,
    });

    return {
        list,
        unreadCount: user ? unread.data?.unreadCount ?? 0 : 0,
        savedPushEndpoint: pushEndpointQuery.data ?? null,
        pushEndpoint: pushEndpointQuery.data ?? null,
        pushEndpointLoading: pushEndpointQuery.isPending,
        markOne,
        markAll,
        registerPushDevice,
        unregisterPushDevice,
    };
}

export function useUserNotificationPreferences() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'notifications', 'preferences'),
        queryFn: ({signal}) => notificationsService.listPreferences(signal),
        enabled: !!user,
    });
}

export function useUserNotificationPreferenceActions() {
    const client = useQueryClient();
    const {user} = useAuth();
    const refresh = () =>
        void client.invalidateQueries({queryKey: queryKeys.of(user?.id, 'notifications', 'preferences')});
    return {
        updatePreference: useMutation({
            mutationFn: ({
                moduleCode,
                payload,
            }: {
                moduleCode: NotificationModuleCode;
                payload: UpdateUserNotificationPreferenceInput;
            }) => notificationsService.updatePreference(moduleCode, payload),
            onSettled: refresh,
        }),
    };
}
