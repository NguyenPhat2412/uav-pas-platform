import {apiClient, API_ROUTES} from '@/lib/api';
import type {FileListQuery, StoredFilePage, StoredFileSummary} from '../types/files.types';
import {fileListSearch} from '../utils/files';

const BASE = API_ROUTES.admin.files;

export const ADMIN_FILE_ROUTES = {
    list: BASE,
    summary: `${BASE}/summary`,
    download: (id: string) => `${BASE}/${encodeURIComponent(id)}/download`,
    remove: (id: string) => `${BASE}/${encodeURIComponent(id)}`,
} as const;

/** Admin file manager; listing reads the database only, downloads use a short-lived signed URL. */
export const filesService = {
    list: (query: FileListQuery, signal?: AbortSignal) =>
        apiClient.get<StoredFilePage>(`${ADMIN_FILE_ROUTES.list}?${fileListSearch(query)}`, {signal}),
    summary: (signal?: AbortSignal) => apiClient.get<StoredFileSummary>(ADMIN_FILE_ROUTES.summary, {signal}),
    downloadUrl: (id: string) => apiClient.get<{ url: string; expiresInSeconds: number }>(ADMIN_FILE_ROUTES.download(id)),
    remove: (id: string) => apiClient.delete<void>(ADMIN_FILE_ROUTES.remove(id)),
};
