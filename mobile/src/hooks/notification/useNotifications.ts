import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import {notificationsService} from '@/api/notification/notifications.api';
import {useAuth} from '@/providers/AuthContext';

// No push notifications without a paid Apple account: the list and badge poll while the app is open.
const POLL_MS = 60_000;

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
    const refresh = () => client.invalidateQueries({queryKey: key});
    const markOne = useMutation({mutationFn: (id: number) => notificationsService.markRead(id), onSuccess: refresh});
    const markAll = useMutation({mutationFn: () => notificationsService.markAllRead(), onSuccess: refresh});
    return {list, unreadCount: unread.data?.unreadCount ?? 0, markOne, markAll, refresh};
}
