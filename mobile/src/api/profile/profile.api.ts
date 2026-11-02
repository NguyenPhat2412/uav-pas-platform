import {apiClient, API_ROUTES, uploadToSignedUrl} from '@/lib/api/client';
import {profilePayload} from '@/shared/forms/profile/profile-form';
import type {CustomerProfile, ProfileFields, SignedAvatarUpload} from '@/shared/types/profile/profile.types';

/** A photo picked or taken on the phone (same shape as media.api's LocalFile). */
export interface AvatarFile {
    uri: string;
    name: string;
    contentType: string;
    size: number;
}

/** Same flow as the web avatarService: a signed URL, the PUT straight to storage, then the backend makes it the avatar. */
export const avatarService = {
    upload: async (file: AvatarFile) => {
        const signed = await apiClient.post<SignedAvatarUpload>(API_ROUTES.users.avatarUploadUrl, {
            originalName: file.name, contentType: file.contentType, size: file.size,
        });
        await uploadToSignedUrl(signed.url, file.uri, file.contentType);
        return apiClient.put<{ avatarUrl: string | null }>(API_ROUTES.users.avatar, {mediaId: signed.mediaId});
    },
    remove: () => apiClient.delete<void>(API_ROUTES.users.avatar),
};

export const profileService = {
    get: (signal?: AbortSignal) => apiClient.get<CustomerProfile>(API_ROUTES.users.profile, {signal}),
    update: (fields: ProfileFields, revision: string) =>
        apiClient.patch<CustomerProfile>(API_ROUTES.users.profile, profilePayload(fields, revision)),
    changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
        apiClient.post<void>(API_ROUTES.users.profilePassword, {currentPassword, newPassword, confirmPassword}),
};
