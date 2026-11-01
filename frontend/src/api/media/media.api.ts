import {apiClient, apiRequest, API_ROUTES} from '@/lib/api';
import type {MediaAsset, MediaInput, PageResponse} from '@/types/resources';
import type {MediaUploadOptions} from '@/types/media/media-upload.types';

export const mediaService = {
    listMedia: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<MediaAsset>>(`${API_ROUTES.media.list}?page=${page}&size=20`, {signal}),
    registerMedia: (data: MediaInput) => apiClient.post<MediaAsset>(API_ROUTES.media.list, data),
    uploadUrl: (id: number) => apiClient.get<{ url: string }>(API_ROUTES.media.uploadUrl(id)),
    confirmMedia: (id: number) => apiClient.post<MediaAsset>(API_ROUTES.media.confirm(id)),
    downloadUrl: (id: number, signal?: AbortSignal) =>
        apiClient.get<{ url: string; expiresInSeconds: number }>(API_ROUTES.media.downloadUrl(id), {signal}),
    deleteMedia: (id: number) => apiClient.delete<void>(API_ROUTES.media.detail(id)),
    /** Register (unless resuming), PUT the file to its signed storage URL, then confirm it. The API enforces type and size. */
    upload: async (file: File, {existing, link, onStep}: MediaUploadOptions = {}) => {
        const contentType = file.type;
        onStep?.('registering');
        const asset = existing || await mediaService.registerMedia({
            originalName: file.name, contentType, size: file.size,
            type: contentType.startsWith('video/') ? 'VIDEO' : contentType.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
            linkedEntityType: link?.type || undefined, linkedEntityId: link?.type ? link.id : undefined
        });
        onStep?.('uploading', asset);
        const signed = await mediaService.uploadUrl(asset.id);
        await apiRequest<void>(signed.url, {
            method: 'PUT',
            headers: {'If-None-Match': '*', 'Content-Type': contentType},
            body: file
        });
        onStep?.('confirming', asset);
        await mediaService.confirmMedia(asset.id);
        return asset;
    },
};
