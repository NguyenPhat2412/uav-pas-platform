import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import {profilePayload} from '@/features/profile/forms/profile-form';
import type {
    BillingProfile,
    BillingProfileFields,
    CustomerProfile,
    ProfileFields
} from '@/features/profile/types/profile.interface';

export const profileService = {
    get: (signal?: AbortSignal) =>
        apiClient.get<CustomerProfile>(API_ROUTES.users.profile, {signal}),
    update: (fields: ProfileFields, revision: string) =>
        apiClient.patch<CustomerProfile>(API_ROUTES.users.profile, profilePayload(fields, revision)),
    changePassword: (currentPassword: string, newPassword: string) =>
        apiClient.post<void>(API_ROUTES.users.profilePassword, {currentPassword, newPassword}),
    getBilling: (signal?: AbortSignal) =>
        apiClient.get<BillingProfile>(API_ROUTES.users.profileBilling, {signal}),
    updateBilling: (fields: BillingProfileFields, expectedVersion: number) =>
        apiClient.put<BillingProfile>(API_ROUTES.users.profileBilling, {expectedVersion, ...fields}),
};
