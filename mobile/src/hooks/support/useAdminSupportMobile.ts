import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {mobileSupportService} from '@/api/support/support.api';
import {useAuth} from '@/providers/AuthContext';
import {supportKeys} from '@/shared/hooks/support/query-keys';
import type {
    SupportQuickReplyInput,
    SupportReplyInput,
    SupportThreadFilter,
    SupportThreadStatus,
} from '@/shared/types/support/support.types';

export function useCanManageSupport(): boolean {
    const {status, can} = useAuth();
    return status === 'signed-in' && (can('DASHBOARD_VIEW') || can('USER_MANAGE'));
}

export function useAdminSupportSummary(enabled = true) {
    const {user} = useAuth();
    const allowed = useCanManageSupport();
    return useQuery({
        queryKey: supportKeys.summary(user?.id),
        queryFn: ({signal}) => mobileSupportService.adminSummary(signal),
        enabled: enabled && allowed,
        refetchInterval: 8_000,
    });
}

export function useAdminSupportThreads(filter: SupportThreadFilter, enabled = true) {
    const {user} = useAuth();
    const allowed = useCanManageSupport();
    return useQuery({
        queryKey: supportKeys.threads(user?.id, filter),
        queryFn: ({signal}) => mobileSupportService.adminThreads(filter, signal),
        enabled: enabled && allowed,
        refetchInterval: 8_000,
    });
}

export function useAdminSupportThreadDetail(id: number | null, enabled = true) {
    const {user} = useAuth();
    const allowed = useCanManageSupport();
    return useQuery({
        queryKey: supportKeys.thread(user?.id, id),
        queryFn: ({signal}) => mobileSupportService.adminThreadDetail(id!, signal),
        enabled: enabled && allowed && id !== null,
        refetchInterval: id !== null ? 5_000 : false,
    });
}

export function useAdminQuickReplies(enabled = true) {
    const {user} = useAuth();
    const allowed = useCanManageSupport();
    return useQuery({
        queryKey: supportKeys.quickReplies(user?.id),
        queryFn: ({signal}) => mobileSupportService.adminQuickReplies(signal),
        enabled: enabled && allowed,
        staleTime: 30_000,
    });
}

export function useAdminSupportMutations() {
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const userId = user?.id;

    const invalidateInbox = () => {
        void queryClient.invalidateQueries({queryKey: supportKeys.summary(userId)});
        void queryClient.invalidateQueries({queryKey: supportKeys.threadsAll(userId)});
    };

    const reply = useMutation({
        mutationFn: ({id, body}: { id: number; body: SupportReplyInput }) =>
            mobileSupportService.adminReply(id, body),
        onSuccess: (detail, variables) => {
            queryClient.setQueryData(supportKeys.thread(userId, variables.id), detail);
            invalidateInbox();
        },
    });

    const updateStatus = useMutation({
        mutationFn: ({id, status}: { id: number; status: SupportThreadStatus }) =>
            mobileSupportService.adminUpdateStatus(id, status),
        onSuccess: (_thread, variables) => {
            void queryClient.invalidateQueries({queryKey: supportKeys.thread(userId, variables.id)});
            invalidateInbox();
        },
    });

    const deleteThread = useMutation({
        mutationFn: (id: number) => mobileSupportService.adminDeleteThread(id),
        onSuccess: (_res, id) => {
            queryClient.removeQueries({queryKey: supportKeys.thread(userId, id)});
            invalidateInbox();
        },
    });

    const createQuickReply = useMutation({
        mutationFn: (body: SupportQuickReplyInput) => mobileSupportService.adminCreateQuickReply(body),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: supportKeys.quickReplies(userId)});
        },
    });

    const deleteQuickReply = useMutation({
        mutationFn: (id: number) => mobileSupportService.adminDeleteQuickReply(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: supportKeys.quickReplies(userId)});
        },
    });

    return {
        reply,
        updateStatus,
        deleteThread,
        createQuickReply,
        deleteQuickReply,
    };
}
