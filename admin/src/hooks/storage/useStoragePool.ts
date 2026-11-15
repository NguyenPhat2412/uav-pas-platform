'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {storagePoolService} from '@/api/storage/storage-pool.api';
import type {
    GoogleOAuthAuthorizeInput,
    GoogleOAuthConfigInput,
    StorageDriveNodeCreateInput,
    StorageDriveNodeUpdateInput,
    StoragePoolPolicyInput,
    StorageR2MigrationInput,
} from '@/types/storage/storage-pool.types';

export function useStoragePoolOverview() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'storage-pool', 'overview'),
        queryFn: ({signal}) => storagePoolService.overview(signal),
    });
}

function useInvalidateStorageQueries() {
    const {user} = useAuth();
    const client = useQueryClient();
    return () => {
        void client.invalidateQueries({queryKey: queryKeys.of(user?.id, 'storage-pool')});
        void client.invalidateQueries({queryKey: queryKeys.of(user?.id, 'infrastructure', 'storage')});
        void client.invalidateQueries({queryKey: queryKeys.of(user?.id, 'admin-files')});
    };
}

export function useUpdateStoragePolicy() {
    const invalidate = useInvalidateStorageQueries();
    return useMutation({
        mutationFn: (body: StoragePoolPolicyInput) => storagePoolService.updatePolicy(body),
        onSuccess: invalidate,
    });
}

export function useSaveGoogleOAuthConfig() {
    const invalidate = useInvalidateStorageQueries();
    return useMutation({
        mutationFn: (body: GoogleOAuthConfigInput) => storagePoolService.saveOAuthConfig(body),
        onSuccess: invalidate,
    });
}

export function useCreateGoogleAuthorizeUrl() {
    return useMutation({
        mutationFn: (body: GoogleOAuthAuthorizeInput) => storagePoolService.createAuthorizeUrl(body),
    });
}

export function useCreateDriveNode() {
    const invalidate = useInvalidateStorageQueries();
    return useMutation({
        mutationFn: (body: StorageDriveNodeCreateInput) => storagePoolService.createNode(body),
        onSuccess: invalidate,
    });
}

export function useUpdateDriveNode() {
    const invalidate = useInvalidateStorageQueries();
    return useMutation({
        mutationFn: ({id, body}: { id: number; body: StorageDriveNodeUpdateInput }) =>
            storagePoolService.updateNode(id, body),
        onSuccess: invalidate,
    });
}

export function useSyncDriveNode() {
    const invalidate = useInvalidateStorageQueries();
    return useMutation({
        mutationFn: (id: number) => storagePoolService.syncNode(id),
        onSuccess: invalidate,
    });
}

export function useDeleteDriveNode() {
    const invalidate = useInvalidateStorageQueries();
    return useMutation({
        mutationFn: (id: number) => storagePoolService.deleteNode(id),
        onSuccess: invalidate,
    });
}

export function useMigrateR2Batch() {
    const invalidate = useInvalidateStorageQueries();
    return useMutation({
        mutationFn: (body: StorageR2MigrationInput) => storagePoolService.migrateR2(body),
        onSuccess: invalidate,
    });
}

export function useMigrateSingleFile() {
    const invalidate = useInvalidateStorageQueries();
    return useMutation({
        mutationFn: ({fileId, deleteSourceFromR2 = false}: { fileId: string; deleteSourceFromR2?: boolean }) =>
            storagePoolService.migrateFile(fileId, deleteSourceFromR2),
        onSuccess: invalidate,
    });
}
