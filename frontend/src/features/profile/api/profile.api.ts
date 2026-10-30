import {apiClient, apiRequest} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import {profilePayload} from '@/features/profile/forms/profile-form';
import type {BillingProfile, BillingProfileFields, CustomerProfile, ProfileFields, SignedAvatarUpload} from '@/features/profile/types/profile.types';

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

export const profileService = {
    get: (signal?: AbortSignal) =>
        apiClient.get<CustomerProfile>(API_ROUTES.users.profile, {signal}),
    update: (fields: ProfileFields, revision: string) =>
        apiClient.patch<CustomerProfile>(API_ROUTES.users.profile, profilePayload(fields, revision)),
    changePassword: (currentPassword: string, newPassword: string, confirmPassword?: string) =>
        apiClient.post<void>(API_ROUTES.users.profilePassword, {currentPassword, newPassword, confirmPassword}),
    getBilling: (signal?: AbortSignal) =>
        apiClient.get<BillingProfile>(API_ROUTES.users.profileBilling, {signal}),
    updateBilling: (fields: BillingProfileFields, expectedVersion: number) =>
        apiClient.put<BillingProfile>(API_ROUTES.users.profileBilling, {expectedVersion, ...fields}),
};
