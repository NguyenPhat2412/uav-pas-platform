import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {projectsService} from '@/api/project/projects.api';
import {useOrderRealtimeSync} from '@/hooks/order/useOrders';
import {useAuth} from '@/providers/AuthContext';
import {projectKeys} from '@/shared/hooks/project/query-keys';
import {queryKeys} from '@/shared/lib/query';
import type {
    CustomerProjectUpsertInput,
    ProjectSubscriptionCreateInput,
    ProjectSubscriptionUpdateInput,
} from '@/shared/types/project/project.types';

export function useProjectList(search = '', page = 0) {
    const {user, status} = useAuth();
    useOrderRealtimeSync();
    return useQuery({
        queryKey: projectKeys.list(user?.id, page, search),
        queryFn: ({signal}) => projectsService.list(page, search, signal),
        placeholderData: keepPreviousData,
        enabled: status === 'signed-in' && Boolean(user),
        retry: false,
    });
}

export function useProjectDetail(projectId: number) {
    const {user, status} = useAuth();
    useOrderRealtimeSync();
    const valid = Number.isSafeInteger(projectId) && projectId > 0;
    return useQuery({
        queryKey: projectKeys.detail(user?.id, projectId),
        queryFn: ({signal}) => projectsService.detail(projectId, signal),
        enabled: valid && status === 'signed-in' && Boolean(user),
        retry: false,
    });
}

export function useProjectSubscriptions(projectId: number) {
    const {user, status} = useAuth();
    useOrderRealtimeSync();
    const valid = Number.isSafeInteger(projectId) && projectId > 0;
    return useQuery({
        queryKey: projectKeys.subscriptions(user?.id, projectId, 0),
        queryFn: ({signal}) => projectsService.listSubscriptions(projectId, 0, signal),
        placeholderData: keepPreviousData,
        enabled: valid && status === 'signed-in' && Boolean(user),
        retry: false,
    });
}

export function useProjectMutations() {
    const {user} = useAuth();
    const qc = useQueryClient();

    const refresh = () => {
        void qc.invalidateQueries({queryKey: projectKeys.all(user?.id)});
        void qc.invalidateQueries({queryKey: queryKeys.feature(user?.id, 'orders')});
        void qc.invalidateQueries({queryKey: queryKeys.feature(user?.id, 'customer')});
    };

    return {
        createProject: useMutation({
            mutationFn: (payload: CustomerProjectUpsertInput) => projectsService.create(payload),
            onSettled: refresh,
        }),
        updateProject: useMutation({
            mutationFn: ({
                id,
                payload,
            }: {
                id: number;
                payload: Partial<CustomerProjectUpsertInput>;
            }) => projectsService.update(id, payload),
            onSettled: refresh,
        }),
        deleteProject: useMutation({
            mutationFn: (id: number) => projectsService.remove(id),
            onSettled: refresh,
        }),
        createSubscription: useMutation({
            mutationFn: ({
                projectId,
                payload,
            }: {
                projectId: number;
                payload: ProjectSubscriptionCreateInput;
            }) => projectsService.createSubscription(projectId, payload),
            onSettled: refresh,
        }),
        updateSubscription: useMutation({
            mutationFn: ({
                projectId,
                subId,
                payload,
            }: {
                projectId: number;
                subId: number;
                payload: ProjectSubscriptionUpdateInput;
            }) => projectsService.updateSubscription(projectId, subId, payload),
            onSettled: refresh,
        }),
        cancelSubscription: useMutation({
            mutationFn: ({projectId, subId}: { projectId: number; subId: number }) =>
                projectsService.cancelSubscription(projectId, subId),
            onSettled: refresh,
        }),
    };
}
