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
    downloadUrl?: string | null;
    mediaAssetId?: number | null;
    status: string;
    reviewerNote?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export type ProviderDocumentReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProviderDocumentModerationInput {
    status: ProviderDocumentReviewStatus;
    reviewerNote?: string;
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
    providerVerificationStatus?: ProviderVerificationStatus;
    categoryServiceId?: number | null;
    categoryServiceCode?: string | null;
    categoryServiceName?: string | null;
    slug: string;
    title: string;
    summary?: string | null;
    description?: string | null;
    listingType: 'FLIGHT_SERVICE' | 'WET_LEASE' | 'DRY_LEASE';
    missionType: string;
    pricingModel: 'PER_HOUR' | 'PER_HECTARE' | 'PER_DAY' | 'PER_PACKAGE';
    basePriceVnd: number;
    minBookingUnits: number;
    securityDepositVnd: number;
    province: string;
    serviceRadiusKm: number;
    equipmentSpecs?: string | null;
    deliverablesSummary?: string | null;
    coverImageUrl?: string | null;
    onSiteSlaHours?: number | null;
    deliverySlaHours?: number | null;
    moderationStatus: ListingModerationStatus;
    moderationNote?: string | null;
    ratingAvg?: number | null;
    reviewCount?: number;
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

export interface SignedMediaDownloadUrl {
    mediaId?: number;
    url: string;
    expiresInSeconds?: number;
}

export type ProviderOrderStatus =
    | 'NOT_APPLICABLE'
    | 'PENDING_DISPATCH'
    | 'OPEN_RFQ'
    | 'PENDING_PROVIDER'
    | 'ACCEPTED'
    | 'DECLINED';

export interface AdminMarketplaceOrder {
    id: number;
    version?: number;
    code: string;
    customerId?: number | null;
    customerName?: string | null;
    serviceId?: number | null;
    missionType: string;
    title: string;
    description?: string | null;
    requestedDate?: string | null;
    startTime?: string | null;
    expectedEndTime?: string | null;
    locationName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    stationId?: number | null;
    uavId?: number | null;
    operatorId?: number | null;
    priority?: string;
    status: string;
    notes?: string | null;
    completionNote?: string | null;
    failureReason?: string | null;
    failureNotes?: string | null;
    billingStatus?: string | null;
    providerId?: number | null;
    providerDisplayName?: string | null;
    listingId?: number | null;
    listingTitle?: string | null;
    pricingModelSnapshot?: 'PER_HOUR' | 'PER_HECTARE' | 'PER_DAY' | 'PER_PACKAGE' | null;
    unitPriceSnapshotVnd?: number | null;
    bookingUnits?: number | null;
    quotedSubtotalVnd?: number | null;
    securityDepositVnd?: number | null;
    providerResponseStatus?: ProviderOrderStatus | null;
    providerResponseNote?: string | null;
    projectId?: number | null;
    projectName?: string | null;
    subscriptionId?: number | null;
    statusGroup?: string | null;
    reviewed?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface DispatchCandidateProvider {
    providerId: number;
    displayName: string;
    province: string;
    distanceKm: number;
    availableUavCount: number;
    ratingAvg: number;
    completedMissionsCount: number;
    score: number;
}

export interface AdminDispatchQueueItem {
    mission: AdminMarketplaceOrder;
    candidates: DispatchCandidateProvider[];
}

export interface ManualDispatchInput {
    providerId: number;
    note?: string;
}

export interface AutoDispatchInput {
    missionId?: number;
    note?: string;
}

export interface AdminMarketplaceStats {
    totalOrders: number;
    pendingDispatchCount: number;
    pendingProviderCount: number;
    scheduledCount: number;
    inFlightCount: number;
    deliveredCount: number;
    reviewedCount: number;
    cancelledCount: number;
    activeProvidersCount: number;
    pendingProvidersCount: number;
    publishedListingsCount: number;
    pendingListingsCount: number;
    illustrativeGrossRevenueVnd: number;
    illustrativePlatformFeeVnd: number;
    illustrativeNote?: string | null;
}

export interface AdminOrderFilter {
    status?: string;
    projectId?: string;
    providerId?: string;
    search?: string;
    page?: number;
    size?: number;
}

export type AdminProviderPage = PageResponse<AdminProviderProfile>;
export type AdminListingPage = PageResponse<AdminMarketplaceListing>;
export type AdminPayoutPage = PageResponse<AdminProviderPayout>;
export type AdminDispatchQueuePage = PageResponse<AdminDispatchQueueItem>;
export type AdminMarketplaceOrderPage = PageResponse<AdminMarketplaceOrder>;

export type AdminProjectStatus = 'ACTIVE' | 'ARCHIVED';
export type AdminSubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';
export type AdminSubscriptionScheduleType = 'ONCE' | 'WEEKLY' | 'MONTHLY';

export interface AdminCustomerProject {
    id: number;
    code: string;
    name: string;
    province?: string | null;
    areaGeoJson?: string | null;
    note?: string | null;
    status: AdminProjectStatus;
    customerId?: number | null;
    customerUsername?: string | null;
    customerFullName?: string | null;
    activeSubscriptionCount: number;
    missionCount: number;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface AdminProjectSubscription {
    id: number;
    projectId: number;
    projectName?: string | null;
    listingId: number;
    listingSlug?: string | null;
    listingTitle?: string | null;
    pricingModel: 'PER_HOUR' | 'PER_HECTARE' | 'PER_DAY' | 'PER_PACKAGE';
    areaGeoJson?: string | null;
    scheduleType: AdminSubscriptionScheduleType;
    status: AdminSubscriptionStatus;
    startDate?: string | null;
    nextRunDate?: string | null;
    nextRunAt?: string | null;
    units: number;
    unitPriceVnd: number;
    estimatedTotalVnd: number;
    note?: string | null;
    firstMissionId?: number | null;
    firstMissionCode?: string | null;
    latestMissionId?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface AdminProjectFilter {
    keyword?: string;
    province?: string;
    status?: AdminProjectStatus | '';
    page?: number;
    size?: number;
}

export type AdminCustomerProjectPage = PageResponse<AdminCustomerProject>;
export type AdminProjectSubscriptionPage = PageResponse<AdminProjectSubscription>;
