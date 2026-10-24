import {apiClient, apiRequest} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {SignedAvatarUpload} from '@/features/profile/types/profile.interface';

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX_BYTES = 5_000_000;

export function avatarFileError(file: File): 'type' | 'size' | null {
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type';
    if (file.size < 1 || file.size > AVATAR_MAX_BYTES) return 'size';
    return null;
}

/** Signed upload straight to storage, then the backend confirms the object and makes it the avatar. */
export const avatarService = {
    upload: async (file: File) => {
        const signed = await apiClient.post<SignedAvatarUpload>(API_ROUTES.users.avatarUploadUrl, {
            originalName: file.name, contentType: file.type, size: file.size
        });
        await apiRequest<void>(signed.url, {
            method: 'PUT',
            headers: {'If-None-Match': '*', 'Content-Type': file.type},
            body: file
        });
        return apiClient.put<{ avatarUrl: string | null }>(API_ROUTES.users.avatar, {mediaId: signed.mediaId});
    },
    remove: () => apiClient.delete<void>(API_ROUTES.users.avatar),
};
