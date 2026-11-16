"use client";

import {useEffect} from 'react';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {operationsRealtimeClient, type OperationsRealtimeFrame} from '@/lib/realtime-ws';
import {useAuth} from "@/providers/AuthContext";
import {useI18n} from '@/providers/I18nContext';
import {queryKeys} from '@/lib/query';
import {notificationsService} from '@/api/notification/notifications.api';
import {usersService} from '@/api/user/users.api';
import type {
    NotificationItem,
    NotificationModuleCode,
    NotificationResponse,
    RealtimeNotificationPopupPayload,
    UpdateUserNotificationPreferenceInput,
} from '@/types/notification/notification.types';

export type {NotificationItem};

export function toNotificationItem(item: NotificationResponse): NotificationItem {
    return {
        ...item,
        id: String(item.id),
        message: item.content,
        type:
            item.severity === 'CRITICAL' || item.type === 'SAR_TARGET_FOUND'
                ? 'ALERT'
                : item.type === 'QUOTA_WARNING'
                  ? 'WARNING'
                  : 'INFO',
    };
}

export interface IncomingRealtimeNotificationEvent {
    notification: RealtimeNotificationPopupPayload;
    screenPopup: boolean;
    desktopOs: boolean;
}

export function useRealtimeNotificationFeed(
    onIncoming?: (event: IncomingRealtimeNotificationEvent) => void,
) {
    const {user} = useAuth();
    const client = useQueryClient();
    const userId = user?.id;

    useEffect(() => {
        if (userId == null) return;
        const feature = queryKeys.feature(userId, 'notifications');
        const onFrame = (frame: OperationsRealtimeFrame) => {
            if (frame.type !== 'NOTIFICATION_CREATED') return;
            client.setQueryData([...feature, 'unread'], {unreadCount: frame.unreadCount ?? 0});
            void client.invalidateQueries({queryKey: [...feature, 'recent']});
            if (onIncoming && frame.notification) {
                onIncoming({
                    notification: frame.notification,
                    screenPopup: frame.screenPopup !== false,
                    desktopOs: frame.desktopOs !== false,
                });
            }
        };
        return operationsRealtimeClient.subscribeFrames(onFrame);
    }, [userId, client, onIncoming]);
}

export function useNotifications() {
    const {user} = useAuth();
    const {t} = useI18n();
    const client = useQueryClient();
    const key = queryKeys.feature(user?.id, 'notifications');
    const list = useQuery({
        queryKey: [...key, 'recent'],
        enabled: !!user,
        retry: false,
        queryFn: async ({signal}) =>
            (await notificationsService.recent(50, signal)).content.map(toNotificationItem),
    });
    const count = useQuery({
        queryKey: [...key, 'unread'],
        enabled: !!user,
        retry: false,
        queryFn: ({signal}) => notificationsService.unreadCount(signal),
    });
    const mutation = useMutation({
        mutationFn: (id: string | null) =>
            id === null ? notificationsService.markAllRead() : notificationsService.markRead(id),
        onSuccess: () => client.invalidateQueries({queryKey: key}),
    });
    useRealtimeNotificationFeed();
    return {
        notifications: user ? (list.data ?? []) : [],
        unreadCount: user ? (count.data?.unreadCount ?? 0) : 0,
        loading: !!user && (list.isPending || count.isPending),
        busy: mutation.isPending,
        error: mutation.error
            ? t('notificationsShared.markReadError')
            : list.error || count.error
              ? t('notificationsShared.loadError')
              : null,
        reload: () => {
            mutation.reset();
            void client.invalidateQueries({queryKey: key});
        },
        markAllRead: () => mutation.mutate(null),
        markOneRead: (id: string) => mutation.mutate(id),
    };
}

export function useNotificationPage(page: number, size: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'notifications', 'admin-page', page),
        placeholderData: keepPreviousData,
        queryFn: ({signal}) => notificationsService.page(page, size, signal),
        enabled: !!user,
    });
}

export function useNotificationReadActions() {
    const client = useQueryClient();
    const {user} = useAuth();
    const refresh = () => client.invalidateQueries({queryKey: queryKeys.feature(user?.id, 'notifications')});
    return {
        markOne: useMutation({mutationFn: notificationsService.markRead, onSuccess: refresh}),
        markAll: useMutation({mutationFn: notificationsService.markAllRead, onSuccess: refresh}),
        refresh,
    };
}

export function useRecipientSearch(keyword: string, enabled: boolean) {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'notifications', 'recipients', keyword),
        queryFn: ({signal}) => usersService.users(0, keyword, undefined, signal, undefined, 8),
        enabled: enabled && keyword.trim().length >= 2,
    });
}

export function useSendNotification() {
    return useMutation({mutationFn: notificationsService.send});
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
