export interface CustomerProfile {
    id: number;
    fullName: string | null;
    phoneNumber: string | null;
    revision: string;
}

export interface ProfileFields {
    fullName: string;
    phoneNumber: string;
}

export type ProfileErrors = Partial<Record<keyof ProfileFields, string>>;

export interface BillingProfile {
    organizationName: string | null;
    taxCode: string | null;
    billingAddress: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    version: number;
    updatedAt: string | null;
}

export type BillingProfileFields = Record<
    'organizationName' | 'taxCode' | 'billingAddress' | 'emergencyContactName' | 'emergencyContactPhone',
    string
>;

export interface SignedAvatarUpload {
    mediaId: number;
    url: string;
    operation: string;
    expiresInSeconds: number;
}

export type AvatarUploadStatus = { kind: 'error' | 'success'; key: string } | null;

