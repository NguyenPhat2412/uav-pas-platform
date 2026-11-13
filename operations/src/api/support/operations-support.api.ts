import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import {buildQueryString} from '@/lib/format';
import type {
    OpsSupportQuickReply,
    OpsSupportStatus,
    OpsSupportSummary,
    OpsSupportThread,
    OpsSupportThreadDetail,
} from '@/lib/realtime-ws';
import type {PageResponse} from '@/types';

export const operationsSupportService = {
    summary: (signal?: AbortSignal) =>
        apiClient.get<OpsSupportSummary>(API_ROUTES.adminSupport.summary, {signal}),

    threads: (size = 12, signal?: AbortSignal) => {
        const qs = buildQueryString({page: 0, size});
        return apiClient.get<PageResponse<OpsSupportThread>>(`${API_ROUTES.adminSupport.threads}?${qs}`, {signal});
    },

    thread: (id: number, signal?: AbortSignal) =>
        apiClient.get<OpsSupportThreadDetail>(API_ROUTES.adminSupport.thread(id), {signal}),

    reply: (id: number, body: { content: string; status?: OpsSupportStatus | null }) =>
        apiClient.post<OpsSupportThreadDetail>(API_ROUTES.adminSupport.reply(id), body),

    quickReplies: (signal?: AbortSignal) =>
        apiClient.get<OpsSupportQuickReply[]>(API_ROUTES.adminSupport.quickReplies, {signal}),
};
