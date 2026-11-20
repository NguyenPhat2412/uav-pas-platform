'use client';

import {useEffect, useState} from 'react';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {customerProjectsService} from '@/api/project/projects.api';
import {describeOrderRealtimeToast} from '@/forms/project/project-form';
import {billingKeys} from '@/hooks/billing/query-keys';
import {projectKeys} from '@/hooks/project/query-keys';
import {ApiError} from '@/lib/api';
import {displayLabel} from '@/lib/presentation';
import {queryKeys} from '@/lib/query';
import {
    acquireRealtimeConnection,
    getRealtimeStatus,
    subscribeRealtimeEvents,
    subscribeRealtimeStatus,
    type RealtimeConnectionStatus,
} from '@/lib/realtime-ws';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {
    CustomerProjectUpsertInput,
    ProjectSubscriptionCreateInput,
    ProjectSubscriptionUpdateInput,
} from '@/types/project/project.types';

export function useCustomerProjects(page = 0, search = '', size = 20, enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: projectKeys.list(user?.id, page, search),
        placeholderData: keepPreviousData,
        queryFn: ({signal}) => customerProjectsService.list(page, size, search, signal),
        enabled: Boolean(user) && enabled,
        retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
    });
}

export function useCustomerProjectDetail(projectId: number, enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: projectKeys.detail(user?.id, projectId),
        queryFn: ({signal}) => customerProjectsService.detail(projectId, signal),
        enabled: Boolean(user) && Number.isSafeInteger(projectId) && projectId > 0 && enabled,
        retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
    });
}

export function useProjectSubscriptions(projectId: number, page = 0, size = 20, enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: projectKeys.subscriptions(user?.id, projectId, page),
        placeholderData: keepPreviousData,
        queryFn: ({signal}) => customerProjectsService.listSubscriptions(projectId, page, size, signal),
        enabled: Boolean(user) && Number.isSafeInteger(projectId) && projectId > 0 && enabled,
        retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
    });
}

export function useOrderSummary(enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: projectKeys.orderSummary(user?.id),
        queryFn: ({signal}) => customerProjectsService.orderSummary(signal),
        enabled: Boolean(user) && enabled,
        retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
    });
}

export function useOrderTracking(missionId: number, activeFlight = false, enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: projectKeys.orderTracking(user?.id, missionId),
        queryFn: ({signal}) => customerProjectsService.orderTracking(missionId, signal),
        enabled: Boolean(user) && Number.isSafeInteger(missionId) && missionId > 0 && enabled,
        refetchInterval: activeFlight ? 3_000 : false,
        retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
    });
}

let lastOrderToastDedupeKey = '';

export function useOrderRealtimeSync(
    targetMissionId?: number,
    options?: { notifyToast?: boolean },
) {
    const {user} = useAuth();
    const {t} = useI18n();
    const userId = user?.id;
    const notifyToast = Boolean(options?.notifyToast);
    const client = useQueryClient();
    const [wsStatus, setWsStatus] = useState<RealtimeConnectionStatus>(() => getRealtimeStatus());

    useEffect(() => {
        if (!userId) return;
        const release = acquireRealtimeConnection({authenticated: true});
        const unsubStatus = subscribeRealtimeStatus(setWsStatus);
        const unsubEvent = subscribeRealtimeEvents(frame => {
            if (frame.type !== 'ORDER_UPDATED') return;
            const customerKey = queryKeys.feature(userId, 'customer');
            void client.invalidateQueries({queryKey: [...customerKey, 'missions']});
            void client.invalidateQueries({queryKey: projectKeys.orderSummary(userId)});
            void client.invalidateQueries({queryKey: projectKeys.all(userId)});
            if (!targetMissionId || frame.missionId === targetMissionId) {
                void client.invalidateQueries({queryKey: [...customerKey, 'mission', frame.missionId]});
                void client.invalidateQueries({queryKey: projectKeys.orderTracking(userId, frame.missionId)});
            }
            if (notifyToast) {
                const meta = describeOrderRealtimeToast(frame);
                if (lastOrderToastDedupeKey !== meta.dedupeKey) {
                    lastOrderToastDedupeKey = meta.dedupeKey;
                    const statusText = displayLabel(frame.status);
                    toast[meta.tone](
                        t('marketplaceShop.orderRealtimeToastBody', {status: statusText}),
                        {title: t('marketplaceShop.orderRealtimeToastTitle', {id: frame.missionId})},
                    );
                }
            }
        });
        return () => {
            unsubEvent();
            unsubStatus();
            release();
        };
    }, [client, notifyToast, t, targetMissionId, userId]);

    return {wsConnected: Boolean(userId) && wsStatus === 'connected'};
}

export function useProjectActions() {
    const {user} = useAuth();
    const client = useQueryClient();
    const invalidateAll = async (projectId?: number) => {
        const customerKey = queryKeys.feature(user?.id, 'customer');
        await Promise.all([
            client.invalidateQueries({queryKey: projectKeys.all(user?.id)}),
            client.invalidateQueries({queryKey: projectKeys.orderSummary(user?.id)}),
            client.invalidateQueries({queryKey: [...customerKey, 'missions']}),
            client.invalidateQueries({queryKey: billingKeys.customer(user?.id)}),
            ...(projectId ? [client.invalidateQueries({queryKey: projectKeys.detail(user?.id, projectId)})] : []),
        ]);
    };

    const createProject = useMutation({
        mutationFn: (payload: CustomerProjectUpsertInput) => customerProjectsService.create(payload),
        onSuccess: created => invalidateAll(created.id),
        retry: false,
    });

    const updateProject = useMutation({
        mutationFn: ({id, payload}: { id: number; payload: Partial<CustomerProjectUpsertInput> }) =>
            customerProjectsService.update(id, payload),
        onSettled: (_d, _e, {id}) => invalidateAll(id),
        retry: false,
    });

    const deleteProject = useMutation({
        mutationFn: (id: number) => customerProjectsService.remove(id),
        onSettled: () => invalidateAll(),
        retry: false,
    });

    const createSubscription = useMutation({
        mutationFn: ({projectId, payload}: { projectId: number; payload: ProjectSubscriptionCreateInput }) =>
            customerProjectsService.createSubscription(projectId, payload),
        onSuccess: (_d, {projectId}) => invalidateAll(projectId),
        retry: false,
    });

    const updateSubscription = useMutation({
        mutationFn: ({
            projectId,
            subId,
            payload,
        }: {
            projectId: number;
            subId: number;
            payload: ProjectSubscriptionUpdateInput;
        }) => customerProjectsService.updateSubscription(projectId, subId, payload),
        onSettled: (_d, _e, {projectId}) => invalidateAll(projectId),
        retry: false,
    });

    const cancelSubscription = useMutation({
        mutationFn: ({projectId, subId}: { projectId: number; subId: number }) =>
            customerProjectsService.cancelSubscription(projectId, subId),
        onSettled: (_d, _e, {projectId}) => invalidateAll(projectId),
        retry: false,
    });

    return {
        createProject,
        updateProject,
        deleteProject,
        createSubscription,
        updateSubscription,
        cancelSubscription,
    };
}
