import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {
    CustomerProject,
    CustomerProjectPage,
    CustomerProjectUpsertInput,
    ProjectSubscription,
    ProjectSubscriptionCreateInput,
    ProjectSubscriptionPage,
    ProjectSubscriptionUpdateInput,
} from '@/shared/types/project.types';

function normalizeSubscriptions(
    raw: ProjectSubscriptionPage | ProjectSubscription[] | null | undefined,
): ProjectSubscription[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return Array.isArray(raw.content) ? raw.content : [];
}

/**
 * Customer Projects & Project Subscriptions CRUD API (`docs/overnight/CONTRACT.md` §2).
 */
export const projectsService = {
    list: (page = 0, search = '', signal?: AbortSignal) =>
        apiClient.get<CustomerProjectPage>(
            `${API_ROUTES.projects.list}?${buildQueryString({
                page,
                size: 20,
                q: search.trim() || undefined,
            })}`,
            {signal},
        ),
    detail: (id: number | string, signal?: AbortSignal) =>
        apiClient.get<CustomerProject>(API_ROUTES.projects.detail(id), {signal}),
    create: (payload: CustomerProjectUpsertInput) =>
        apiClient.post<CustomerProject>(API_ROUTES.projects.list, payload),
    update: (id: number | string, payload: Partial<CustomerProjectUpsertInput>) =>
        apiClient.patch<CustomerProject>(API_ROUTES.projects.detail(id), payload),
    remove: (id: number | string) =>
        apiClient.delete<void>(API_ROUTES.projects.detail(id)),

    listSubscriptions: async (projectId: number | string, page = 0, signal?: AbortSignal) => {
        const res = await apiClient.get<ProjectSubscriptionPage | ProjectSubscription[]>(
            `${API_ROUTES.projects.subscriptions(projectId)}?${buildQueryString({page, size: 20})}`,
            {signal},
        );
        return normalizeSubscriptions(res);
    },
    createSubscription: (projectId: number | string, payload: ProjectSubscriptionCreateInput) =>
        apiClient.post<ProjectSubscription>(API_ROUTES.projects.subscriptions(projectId), payload),
    updateSubscription: (
        projectId: number | string,
        subId: number | string,
        payload: ProjectSubscriptionUpdateInput,
    ) =>
        apiClient.patch<ProjectSubscription>(
            API_ROUTES.projects.subscriptionById(projectId, subId),
            payload,
        ),
    cancelSubscription: (projectId: number | string, subId: number | string) =>
        apiClient.delete<void>(API_ROUTES.projects.subscriptionById(projectId, subId)),
};
