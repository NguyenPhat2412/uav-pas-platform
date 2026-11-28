import {apiClient, API_ROUTES} from '@/lib/api';
import type {
    GoogleOAuthAuthorizeInput,
    GoogleOAuthAuthorizeResult,
    GoogleOAuthConfigInput,
    StorageDriveNode,
    StorageDriveNodeCreateInput,
    StorageDriveNodeUpdateInput,
    StoragePoolOverview,
    StoragePoolPolicyInput,
    StorageR2MigrationInput,
    StorageR2MigrationResult,
} from '@/types/storage-pool.types';

const BASE = API_ROUTES.admin.storagePool;

export const STORAGE_POOL_ROUTES = {
    overview: BASE,
    policy: `${BASE}/policy`,
    oauthConfig: `${BASE}/oauth-config`,
    oauthAuthorizeUrl: `${BASE}/oauth/authorize-url`,
    nodes: `${BASE}/nodes`,
    nodeById: (id: number) => `${BASE}/nodes/${id}`,
    syncNode: (id: number) => `${BASE}/nodes/${id}/sync`,
    migrateR2: `${BASE}/migrate-r2`,
    migrateFile: (fileId: string, deleteSourceFromR2: boolean) =>
        `${BASE}/migrate-file?fileId=${encodeURIComponent(fileId)}&deleteSourceFromR2=${deleteSourceFromR2}`,
} as const;

export const storagePoolService = {
    overview: (signal?: AbortSignal) =>
        apiClient.get<StoragePoolOverview>(STORAGE_POOL_ROUTES.overview, {signal}),
    updatePolicy: (body: StoragePoolPolicyInput) =>
        apiClient.put<StoragePoolOverview>(STORAGE_POOL_ROUTES.policy, body),
    saveOAuthConfig: (body: GoogleOAuthConfigInput) =>
        apiClient.put<StoragePoolOverview>(STORAGE_POOL_ROUTES.oauthConfig, body),
    createAuthorizeUrl: (body: GoogleOAuthAuthorizeInput) =>
        apiClient.post<GoogleOAuthAuthorizeResult>(STORAGE_POOL_ROUTES.oauthAuthorizeUrl, body),
    createNode: (body: StorageDriveNodeCreateInput) =>
        apiClient.post<StorageDriveNode>(STORAGE_POOL_ROUTES.nodes, body),
    updateNode: (id: number, body: StorageDriveNodeUpdateInput) =>
        apiClient.put<StorageDriveNode>(STORAGE_POOL_ROUTES.nodeById(id), body),
    syncNode: (id: number) =>
        apiClient.post<StorageDriveNode>(STORAGE_POOL_ROUTES.syncNode(id), {}),
    deleteNode: (id: number) =>
        apiClient.delete<void>(STORAGE_POOL_ROUTES.nodeById(id)),
    migrateR2: (body: StorageR2MigrationInput) =>
        apiClient.post<StorageR2MigrationResult>(STORAGE_POOL_ROUTES.migrateR2, body),
    migrateFile: (fileId: string, deleteSourceFromR2 = false) =>
        apiClient.post<StorageR2MigrationResult>(STORAGE_POOL_ROUTES.migrateFile(fileId, deleteSourceFromR2), {}),
};
