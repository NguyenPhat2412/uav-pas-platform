"use client";

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from "@/providers/AuthContext";
import {useI18n} from '@/providers/I18nContext';
import {queryKeys} from '@/lib/query';
import {notificationsService} from '@/features/notifications/api/notifications.api';
import {usersService} from '@/features/users/api/users.api';
import type {NotificationItem, NotificationResponse} from '@/features/notifications/types/notification.types';

export type {NotificationItem};

export function toNotificationItem(item: NotificationResponse): NotificationItem {
    return {
        ...item, id: String(item.id), message: item.content,
        type: item.type === 'SAR_TARGET_FOUND' ? 'ALERT' : item.type === 'QUOTA_WARNING' ? 'WARNING' : 'INFO'
    };
}

export function useNotifications() {
    const {user} = useAuth();
    const {t} = useI18n();
    const client = useQueryClient();
    const key = queryKeys.feature(user?.id, 'notifications');
    const list = useQuery({
        queryKey: [...key, 'recent'], enabled: !!user, retry: false,
        queryFn: async ({signal}) => (await notificationsService.recent(50, signal)).content.map(toNotificationItem),
    });
    const count = useQuery({
        queryKey: [...key, 'unread'], enabled: !!user, retry: false,
        queryFn: ({signal}) => notificationsService.unreadCount(signal),
    });
    const mutation = useMutation({
        mutationFn: (id: string | null) => id === null ? notificationsService.markAllRead() : notificationsService.markRead(id),
        onSuccess: () => client.invalidateQueries({queryKey: key}),
    });
    return {
        notifications: user ? list.data ?? [] : [], unreadCount: user ? count.data?.unreadCount ?? 0 : 0,
        loading: !!user && (list.isPending || count.isPending), busy: mutation.isPending,
        error: mutation.error ? t('notificationsShared.markReadError')
            : list.error || count.error ? t('notificationsShared.loadError') : null,
        reload: () => {
            mutation.reset();
            void client.invalidateQueries({queryKey: key});
        },
        markAllRead: () => mutation.mutate(null), markOneRead: (id: string) => mutation.mutate(id),
    };
}

/** One page of the administrator's notification history. */
export function useNotificationPage(page: number, size: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'notifications', 'admin-page', page),
        queryFn: ({signal}) => notificationsService.page(page, size, signal),
        enabled: !!user,
    });
}

/** Read-state changes; each refreshes every notification view (bell, list, counts). */
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

/** Recipient lookup for a new notification; searches from two characters and stops once one is chosen. */
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
