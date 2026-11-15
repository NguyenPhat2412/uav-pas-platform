import type {PageResponse} from '@/types';

export type ProviderVerificationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type ListingModerationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'PAUSED' | 'REJECTED';
export type PayoutStatus = 'PENDING' | 'PAID' | 'REJECTED';

export interface AdminProviderDocument {
    id: number;
    documentType: string;
    title: string;
    documentNumber?: string | null;
    fileUrl?: string | null;
    status: string;
}

export interface AdminProviderProfile {
    id: number;
    userId?: number | null;
    username?: string | null;
    slug: string;
    displayName: string;
    providerType: 'INDIVIDUAL' | 'COMPANY';
    taxOrIdNumber?: string | null;
    flightLicenseNumber?: string | null;
    bio?: string | null;
    province: string;
    serviceRadiusKm: number;
    contactPhone?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountHolder?: string | null;
    verificationStatus: ProviderVerificationStatus;
    reviewNote?: string | null;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    commissionRateOverride?: number | null;
    ratingAvg: number;
    reviewCount: number;
    completedMissionsCount: number;
    createdAt?: string;
    documents: AdminProviderDocument[];
}

export interface AdminMarketplaceListing {
    id: number;
    providerId: number;
    providerSlug: string;
    providerDisplayName: string;
    officialPlatformListing: boolean;
    slug: string;
    title: string;
    summary?: string | null;
    listingType: 'FLIGHT_SERVICE' | 'WET_LEASE' | 'DRY_LEASE';
    missionType: string;
    pricingModel: 'PER_HOUR' | 'PER_HECTARE' | 'PER_DAY' | 'PER_PACKAGE';
    basePriceVnd: number;
    minBookingUnits: number;
    securityDepositVnd: number;
    province: string;
    serviceRadiusKm: number;
    equipmentSpecs?: string | null;
    moderationStatus: ListingModerationStatus;
    moderationNote?: string | null;
    featured: boolean;
    bookingCount: number;
    createdAt?: string;
}

export interface AdminProviderPayout {
    id: number;
    code: string;
    providerId: number;
    providerDisplayName: string;
    amountVnd: number;
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    status: PayoutStatus;
    providerNote?: string | null;
    adminNote?: string | null;
    bankTransferRef?: string | null;
    processedBy?: string | null;
    processedAt?: string | null;
    createdAt?: string;
}

export interface ProviderModerationInput {
    status: ProviderVerificationStatus;
    reviewNote?: string;
    commissionRateOverride?: number | null;
}

export interface ListingModerationInput {
    status: ListingModerationStatus;
    moderationNote?: string;
    featured?: boolean;
}

export interface PayoutProcessInput {
    approve: boolean;
    bankTransferRef?: string;
    adminNote?: string;
}

export type AdminProviderPage = PageResponse<AdminProviderProfile>;
export type AdminListingPage = PageResponse<AdminMarketplaceListing>;
export type AdminPayoutPage = PageResponse<AdminProviderPayout>;
