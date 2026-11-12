import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {PageResponse} from '@/shared/types';
import type {
    PublicSiteInfo,
    PublicSupportCreateInput,
    PublicSupportMessageInput,
    PublicSupportThreadSession,
    SupportAdminSummary,
    SupportQuickReply,
    SupportQuickReplyInput,
    SupportReplyInput,
    SupportThread,
    SupportThreadDetail,
    SupportThreadFilter,
    SupportThreadStatus,
} from '@/shared/types/support/support.types';

/**
 * Mobile API service for public visitor/customer 2-way live support chat,
 * public site contact info, and Admin support inbox / quick-reply templates.
 */
export const mobileSupportService = {
    siteInfo: (signal?: AbortSignal) =>
        apiClient.get<PublicSiteInfo>(API_ROUTES.public.siteInfo, {signal}),

    createPublicThread: (payload: PublicSupportCreateInput, signal?: AbortSignal) =>
        apiClient.post<PublicSupportThreadSession>(API_ROUTES.public.supportThreads, payload, {signal}),

    getPublicThread: (visitorToken: string, markRead = false, signal?: AbortSignal) =>
        apiClient.get<PublicSupportThreadSession>(
            API_ROUTES.public.supportThread(visitorToken, markRead),
            {signal},
        ),

    sendPublicMessage: (visitorToken: string, content: string, signal?: AbortSignal) => {
        const body: PublicSupportMessageInput = {content};
        return apiClient.post<PublicSupportThreadSession>(
            API_ROUTES.public.supportMessages(visitorToken),
            body,
            {signal},
        );
    },

    adminSummary: (signal?: AbortSignal) =>
        apiClient.get<SupportAdminSummary>(API_ROUTES.adminSupport.summary, {signal}),

    adminThreads: (filter: SupportThreadFilter = {}, signal?: AbortSignal) => {
        const qs = buildQueryString({
            status: filter.status || undefined,
            topic: filter.topic || undefined,
            unreadOnly: filter.unreadOnly ? true : undefined,
            q: filter.q?.trim() || undefined,
            page: filter.page ?? 0,
            size: filter.size ?? 25,
        });
        const endpoint = qs ? `${API_ROUTES.adminSupport.threads}?${qs}` : API_ROUTES.adminSupport.threads;
        return apiClient.get<PageResponse<SupportThread>>(endpoint, {signal});
    },

    adminThreadDetail: (id: number, signal?: AbortSignal) =>
        apiClient.get<SupportThreadDetail>(API_ROUTES.adminSupport.thread(id), {signal}),

    adminReply: (id: number, body: SupportReplyInput) =>
        apiClient.post<SupportThreadDetail>(API_ROUTES.adminSupport.reply(id), body),

    adminUpdateStatus: (id: number, status: SupportThreadStatus) =>
        apiClient.patch<SupportThread>(API_ROUTES.adminSupport.status(id), {status}),

    adminDeleteThread: (id: number) =>
        apiClient.delete<void>(API_ROUTES.adminSupport.thread(id)),

    adminQuickReplies: (signal?: AbortSignal) =>
        apiClient.get<SupportQuickReply[]>(API_ROUTES.adminSupport.quickReplies, {signal}),

    adminCreateQuickReply: (body: SupportQuickReplyInput) =>
        apiClient.post<SupportQuickReply>(API_ROUTES.adminSupport.quickReplies, body),

    adminDeleteQuickReply: (id: number) =>
        apiClient.delete<void>(API_ROUTES.adminSupport.quickReply(id)),
};
