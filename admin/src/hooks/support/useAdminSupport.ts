'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {adminSupportService} from '@/api/support/support.api';
import {supportKeys} from '@/hooks/support/query-keys';
import {useAuth} from '@/providers/AuthContext';
import type {
    SupportQuickReplyInput,
    SupportThreadFilter,
    SupportThreadStatus,
} from '@/types/support/support.types';

export function personalizeQuickReply(template: string, fullName: string): string {
    const cleanName = fullName?.trim() || 'Anh/Chị';
    return template.replace(/\{name\}/gi, cleanName);
}

export function useSupportSummary(enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: supportKeys.summary(user?.id),
        queryFn: ({signal}) => adminSupportService.summary(signal),
        enabled: Boolean(user) && enabled,
        refetchInterval: 6000,
    });
}

export function useSupportThreads(filter: SupportThreadFilter, enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: supportKeys.threads(user?.id, filter),
        queryFn: ({signal}) => adminSupportService.threads(filter, signal),
        enabled: Boolean(user) && enabled,
        refetchInterval: 6000,
    });
}

export function useSupportThreadDetail(id: number | null) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useQuery({
        queryKey: supportKeys.thread(user?.id, id),
        queryFn: async ({signal}) => {
            const detail = await adminSupportService.thread(id as number, signal);
            void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
            return detail;
        },
        enabled: Boolean(user) && id !== null && id > 0,
        refetchInterval: 4000,
    });
}

export function useReplySupportThread() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            content,
            status,
        }: {
            id: number;
            content: string;
            status?: SupportThreadStatus | null;
        }) => adminSupportService.reply(id, {content, status}),
        onSuccess: (detail, variables) => {
            client.setQueryData(supportKeys.thread(user?.id, variables.id), detail);
            void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
        },
    });
}

export function useUpdateSupportStatus() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({id, status}: { id: number; status: SupportThreadStatus }) =>
            adminSupportService.updateStatus(id, status),
        onSuccess: (_thread, variables) => {
            void client.invalidateQueries({queryKey: supportKeys.thread(user?.id, variables.id)});
            void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
        },
    });
}

export function useDeleteSupportThread() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => adminSupportService.deleteThread(id),
        onSuccess: (_void, id) => {
            client.removeQueries({queryKey: supportKeys.thread(user?.id, id)});
            void client.invalidateQueries({queryKey: supportKeys.summary(user?.id)});
            void client.invalidateQueries({queryKey: supportKeys.threadsAll(user?.id)});
        },
    });
}

export function useSupportQuickReplies(enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: supportKeys.quickReplies(user?.id),
        queryFn: ({signal}) => adminSupportService.quickReplies(signal),
        enabled: Boolean(user) && enabled,
    });
}

export function useCreateSupportQuickReply() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: (input: SupportQuickReplyInput) => adminSupportService.createQuickReply(input),
        onSuccess: () => client.invalidateQueries({queryKey: supportKeys.quickReplies(user?.id)}),
    });
}

export function useDeleteSupportQuickReply() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => adminSupportService.deleteQuickReply(id),
        onSuccess: () => client.invalidateQueries({queryKey: supportKeys.quickReplies(user?.id)}),
    });
}
