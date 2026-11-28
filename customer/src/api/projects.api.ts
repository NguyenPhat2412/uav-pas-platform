import {apiClient, API_ROUTES} from '@/lib/api';
import type {
    CustomerOrderSummary,
    CustomerProject,
    CustomerProjectPage,
    CustomerProjectUpsertInput,
    OrderTrackingSnapshot,
    ProjectSubscription,
    ProjectSubscriptionCreateInput,
    ProjectSubscriptionPage,
    ProjectSubscriptionUpdateInput,
} from '@/types/project.types';

function normalizePage<T>(
    raw:
        | {
              content?: T[];
              page?: number;
              size?: number;
              totalElements?: number;
              totalPages?: number;
              first?: boolean;
              last?: boolean;
              hasNext?: boolean;
              hasPrevious?: boolean;
          }
        | T[],
    page = 0,
    size = 20,
) {
    if (Array.isArray(raw)) {
        return {
            content: raw,
            page,
            size,
            totalElements: raw.length,
            totalPages: raw.length > 0 ? 1 : 0,
            first: true,
            last: true,
            hasNext: false,
            hasPrevious: false,
        };
    }
    const content = Array.isArray(raw?.content) ? raw.content : [];
    const currentPage = typeof raw?.page === 'number' ? raw.page : page;
    const totalElements = typeof raw?.totalElements === 'number' ? raw.totalElements : content.length;
    const totalPages =
        typeof raw?.totalPages === 'number'
            ? raw.totalPages
            : totalElements > 0
              ? Math.ceil(totalElements / size)
              : 0;
    const hasNext = typeof raw?.hasNext === 'boolean' ? raw.hasNext : currentPage + 1 < totalPages;
    const hasPrevious = typeof raw?.hasPrevious === 'boolean' ? raw.hasPrevious : currentPage > 0;
    return {
        content,
        page: currentPage,
        size: typeof raw?.size === 'number' ? raw.size : size,
        totalElements,
        totalPages,
        first: typeof raw?.first === 'boolean' ? raw.first : currentPage === 0,
        last: typeof raw?.last === 'boolean' ? raw.last : !hasNext,
        hasNext,
        hasPrevious,
    };
}

export const customerProjectsService = {
    list: async (page = 0, size = 20, search = '', signal?: AbortSignal): Promise<CustomerProjectPage> => {
        const params = new URLSearchParams({
            page: String(page),
            size: String(size),
            ...(search.trim() ? {q: search.trim(), search: search.trim()} : {}),
        });
        const raw = await apiClient.get<CustomerProjectPage | CustomerProject[]>(
            `${API_ROUTES.projects.list}?${params.toString()}`,
            {signal},
        );
        return normalizePage(raw, page, size);
    },

    detail: (id: number, signal?: AbortSignal) =>
        apiClient.get<CustomerProject>(API_ROUTES.projects.detail(id), {signal}),

    create: (payload: CustomerProjectUpsertInput) =>
        apiClient.post<CustomerProject>(API_ROUTES.projects.list, {
            name: payload.name.trim(),
            province: payload.province.trim(),
            areaGeoJson: payload.areaGeoJson?.trim() || undefined,
            note: payload.note?.trim() || undefined,
        }),

    update: (id: number, payload: Partial<CustomerProjectUpsertInput>) =>
        apiClient.patch<CustomerProject>(API_ROUTES.projects.detail(id), {
            ...(payload.name !== undefined ? {name: payload.name.trim()} : {}),
            ...(payload.province !== undefined ? {province: payload.province.trim()} : {}),
            ...(payload.areaGeoJson !== undefined ? {areaGeoJson: payload.areaGeoJson?.trim() || null} : {}),
            ...(payload.note !== undefined ? {note: payload.note?.trim() || null} : {}),
            ...(payload.status !== undefined ? {status: payload.status} : {}),
        }),

    remove: (id: number) =>
        apiClient.delete<void>(API_ROUTES.projects.detail(id)),

    listSubscriptions: async (
        projectId: number,
        page = 0,
        size = 20,
        signal?: AbortSignal,
    ): Promise<ProjectSubscriptionPage> => {
        const params = new URLSearchParams({page: String(page), size: String(size)});
        const raw = await apiClient.get<ProjectSubscriptionPage | ProjectSubscription[]>(
            `${API_ROUTES.projects.subscriptions(projectId)}?${params.toString()}`,
            {signal},
        );
        return normalizePage(raw, page, size);
    },

    createSubscription: (projectId: number, payload: ProjectSubscriptionCreateInput) =>
        apiClient.post<ProjectSubscription>(API_ROUTES.projects.subscriptions(projectId), payload),

    updateSubscription: (projectId: number, subId: number, payload: ProjectSubscriptionUpdateInput) =>
        apiClient.patch<ProjectSubscription>(API_ROUTES.projects.subscriptionById(projectId, subId), payload),

    cancelSubscription: (projectId: number, subId: number) =>
        apiClient.delete<void>(API_ROUTES.projects.subscriptionById(projectId, subId)),

    orderSummary: (signal?: AbortSignal) =>
        apiClient.get<CustomerOrderSummary>(API_ROUTES.orders.summary, {signal}),

    orderTracking: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<OrderTrackingSnapshot>(API_ROUTES.orders.tracking(missionId), {signal}),
};
