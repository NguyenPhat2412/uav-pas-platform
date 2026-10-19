"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ROUTES } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type NotificationResponse = {
  id: number; title: string; content: string; type: string; isRead: boolean; createdAt: string;
};
export type NotificationItem = {
  id: string; title: string; message: string; type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  isRead: boolean; createdAt: string;
};
export function toNotificationItem(item: NotificationResponse): NotificationItem {
  return { ...item, id: String(item.id), message: item.content,
    type: item.type === 'SAR_TARGET_FOUND' ? 'ALERT' : item.type === 'QUOTA_WARNING' ? 'WARNING' : 'INFO' };
}

export function useNotifications() {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ['session', user?.id ?? 'anonymous', 'notifications'] as const;
  const list = useQuery({
    queryKey: [...key, 'recent'], enabled: !!user, retry: false,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<{ content: NotificationResponse[] }>(`${API_ROUTES.notifications.list}?size=50`, { signal });
      return response.content.map(toNotificationItem);
    },
  });
  const count = useQuery({
    queryKey: [...key, 'unread'], enabled: !!user, retry: false,
    queryFn: ({ signal }) => apiClient.get<{ unreadCount: number }>(API_ROUTES.notifications.unreadCount, { signal }),
  });
  const mutation = useMutation({
    mutationFn: (id: string | null) => id === null
      ? apiClient.post(API_ROUTES.notifications.markAllRead)
      : apiClient.patch(API_ROUTES.notifications.markRead(id)),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  return {
    notifications: user ? list.data ?? [] : [], unreadCount: user ? count.data?.unreadCount ?? 0 : 0,
    loading: !!user && (list.isPending || count.isPending), busy: mutation.isPending,
    error: mutation.error ? 'Chưa cập nhật được trạng thái đã đọc. Vui lòng thử lại.'
      : list.error || count.error ? 'Không tải được thông báo. Vui lòng thử lại.' : null,
    reload: () => { mutation.reset(); void client.invalidateQueries({ queryKey: key }); },
    markAllRead: () => mutation.mutate(null), markOneRead: (id: string) => mutation.mutate(id),
  };
}
