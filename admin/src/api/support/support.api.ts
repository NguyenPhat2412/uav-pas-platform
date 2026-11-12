import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import {buildQueryString} from '@/lib/format';
import type {PageResponse} from '@/types';
import type {
    SupportAdminSummary,
    SupportQuickReply,
    SupportQuickReplyInput,
    SupportReplyInput,
    SupportThread,
    SupportThreadDetail,
    SupportThreadFilter,
    SupportThreadStatus,
} from '@/types/support/support.types';

export const adminSupportService = {
    summary: (signal?: AbortSignal) =>
        apiClient.get<SupportAdminSummary>(API_ROUTES.adminSupport.summary, {signal}),

    threads: (filter: SupportThreadFilter = {}, signal?: AbortSignal) => {
        const qs = buildQueryString({
            status: filter.status || undefined,
            topic: filter.topic || undefined,
            unreadOnly: filter.unreadOnly ? true : undefined,
            q: filter.q?.trim() || undefined,
            page: filter.page ?? 0,
            size: filter.size ?? 20,
        });
        const endpoint = qs ? `${API_ROUTES.adminSupport.threads}?${qs}` : API_ROUTES.adminSupport.threads;
        return apiClient.get<PageResponse<SupportThread>>(endpoint, {signal});
    },

    thread: (id: number | string, signal?: AbortSignal) =>
        apiClient.get<SupportThreadDetail>(API_ROUTES.adminSupport.thread(id), {signal}),

    reply: (id: number | string, body: SupportReplyInput) =>
        apiClient.post<SupportThreadDetail>(API_ROUTES.adminSupport.reply(id), body),

    updateStatus: (id: number | string, status: SupportThreadStatus) =>
        apiClient.patch<SupportThread>(API_ROUTES.adminSupport.status(id), {status}),

    deleteThread: (id: number | string) =>
        apiClient.delete<void>(API_ROUTES.adminSupport.thread(id)),

    quickReplies: (signal?: AbortSignal) =>
        apiClient.get<SupportQuickReply[]>(API_ROUTES.adminSupport.quickReplies, {signal}),

    createQuickReply: (body: SupportQuickReplyInput) =>
        apiClient.post<SupportQuickReply>(API_ROUTES.adminSupport.quickReplies, body),

    deleteQuickReply: (id: number | string) =>
        apiClient.delete<void>(API_ROUTES.adminSupport.quickReply(id)),
};
