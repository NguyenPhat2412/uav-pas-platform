import type {MissionType, PageResponse} from '@/types/mission/mission.types';

export type ProviderType = 'INDIVIDUAL' | 'COMPANY';
export type ProviderVerificationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type ProviderDocumentType =
    | 'IDENTITY_CARD'
    | 'BUSINESS_LICENSE'
    | 'PILOT_CERTIFICATE'
    | 'UAV_REGISTRATION'
    | 'INSURANCE_POLICY';
export type ProviderDocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ListingType = 'FLIGHT_SERVICE' | 'WET_LEASE' | 'DRY_LEASE';
export type PricingModel = 'PER_HOUR' | 'PER_HECTARE' | 'PER_DAY' | 'PER_PACKAGE';
export type ListingModerationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'PAUSED' | 'REJECTED';
export type ProviderOrderStatus = 'NOT_APPLICABLE' | 'OPEN_RFQ' | 'PENDING_PROVIDER' | 'ACCEPTED' | 'DECLINED';
export type EscrowStatus = 'NONE' | 'UNFUNDED' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
export type WalletTransactionType =
    | 'ESCROW_HOLD'
    | 'ESCROW_RELEASE'
    | 'PAYOUT_REQUEST'
    | 'PAYOUT_COMPLETED'
    | 'PAYOUT_REJECTED'
    | 'ESCROW_REFUND';
export type PayoutStatus = 'PENDING' | 'PAID' | 'REJECTED';
export type MissionBidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type ProviderEquipmentCategory = 'BATTERY' | 'CAMERA' | 'KV260' | 'SENSOR' | 'ACCESSORY';

export interface ProviderDocument {
    id: number;
    documentType: ProviderDocumentType;
    title: string;
    documentNumber?: string | null;
    fileUrl?: string | null;
    mediaAssetId?: number | null;
    status: ProviderDocumentStatus;
    reviewerNote?: string | null;
    createdAt?: string;
}

export interface ProviderProfile {
    id: number;
    userId?: number | null;
    username?: string | null;
    slug: string;
    displayName: string;
    providerType: ProviderType;
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
    documents: ProviderDocument[];
}

export interface ProviderOnboardingInput {
    displayName: string;
    providerType: ProviderType;
    taxOrIdNumber?: string;
    flightLicenseNumber?: string;
    bio?: string;
    province: string;
    serviceRadiusKm?: number;
    contactPhone?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    submitForReview?: boolean;
}

export interface ProviderDocumentInput {
    documentType: ProviderDocumentType;
    title: string;
    documentNumber?: string;
    fileUrl?: string;
    mediaAssetId?: number;
}

export interface MarketplaceListing {
    id: number;
    providerId?: number | null;
    providerSlug?: string | null;
    providerDisplayName: string;
    providerVerificationStatus: ProviderVerificationStatus;
    officialPlatformListing: boolean;
    categoryServiceId?: number | null;
    categoryServiceCode?: string | null;
    categoryServiceName?: string | null;
    slug: string;
    title: string;
    summary?: string | null;
    description?: string | null;
    listingType: ListingType;
    missionType: MissionType;
    pricingModel: PricingModel;
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
    ratingAvg: number;
    reviewCount: number;
    bookingCount: number;
    featured: boolean;
    createdAt?: string;
}

export interface MarketplaceReview {
    id: number;
    missionId: number;
    missionTitle: string;
    customerName: string;
    overallRating?: number | null;
    dataQualityRating?: number | null;
    timelinessRating?: number | null;
    deliverablesAccepted: boolean;
    comment?: string | null;
    updatedAt?: string;
}

export interface MarketplaceListingDetail {
    listing: MarketplaceListing;
    reviews: MarketplaceReview[];
}

export interface MarketplaceStorefront {
    provider: ProviderProfile;
    listings: MarketplaceListing[];
    reviews: MarketplaceReview[];
}

export type ListingSortOption = 'featured' | 'rating' | 'price_asc' | 'price_desc';

export interface PublicListingFilters {
    keyword?: string;
    listingType?: ListingType | '';
    missionType?: MissionType | '';
    pricingModel?: PricingModel | '';
    province?: string;
    maxPriceVnd?: number | '';
    categoryServiceId?: number | '';
    sortBy?: ListingSortOption;
    page?: number;
    size?: number;
}

export interface MarketplaceListingUpsertInput {
    categoryServiceId?: number;
    title: string;
    summary?: string;
    description?: string;
    listingType: ListingType;
    missionType: MissionType;
    pricingModel: PricingModel;
    basePriceVnd: number;
    minBookingUnits?: number;
    securityDepositVnd?: number;
    province: string;
    serviceRadiusKm?: number;
    equipmentSpecs?: string;
    deliverablesSummary?: string;
    coverImageUrl?: string;
    onSiteSlaHours?: number;
    deliverySlaHours?: number;
    submitForReview?: boolean;
}

export interface ProviderUav {
    id: number;
    model: string;
    serialNumber: string;
    manufacturer: string;
    status: string;
    createdAt?: string;
}

export interface ProviderEquipment {
    id: number;
    name: string;
    type: ProviderEquipmentCategory;
    serialNumber?: string | null;
    quantity: number;
    availableQuantity: number;
    status: string;
    createdAt?: string;
}

export interface ProviderFleetSummary {
    uavs: ProviderUav[];
    equipment: ProviderEquipment[];
}

export interface ProviderUavCreateInput {
    model: string;
    serialNumber: string;
    manufacturer: string;
}

export interface ProviderEquipmentCreateInput {
    name: string;
    type: ProviderEquipmentCategory;
    serialNumber?: string;
    quantity: number;
}

export interface ProviderOrderActionInput {
    accept: boolean;
    uavId?: number;
    responseNote?: string;
}

export interface ProviderOrderCompleteInput {
    completionNote: string;
    equipmentCondition?: string;
}

export interface MissionBid {
    id: number;
    missionId: number;
    missionCode: string;
    missionTitle: string;
    providerId: number;
    providerSlug: string;
    providerDisplayName: string;
    providerRatingAvg: number;
    providerCompletedMissionsCount: number;
    proposedPriceVnd: number;
    estimatedDeliveryHours?: number | null;
    proposalNote: string;
    proposedUavModel?: string | null;
    status: MissionBidStatus;
    respondedAt?: string | null;
    createdAt?: string;
}

export interface MissionBidCreateInput {
    proposedPriceVnd: number;
    estimatedDeliveryHours?: number;
    proposalNote: string;
    proposedUavModel?: string;
}

export interface WalletTransaction {
    id: number;
    invoiceId?: number | null;
    payoutId?: number | null;
    transactionType: WalletTransactionType;
    grossAmountVnd: number;
    feeAmountVnd: number;
    netAmountVnd: number;
    balanceAfterVnd: number;
    description?: string | null;
    createdAt?: string;
}

export interface ProviderPayout {
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

export interface ProviderWallet {
    providerId: number;
    providerDisplayName: string;
    platformFeeRate: number;
    escrowHeldVnd: number;
    availableBalanceVnd: number;
    pendingPayoutVnd: number;
    totalEarnedVnd: number;
    totalWithdrawnVnd: number;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountHolder?: string | null;
    recentTransactions: WalletTransaction[];
    payouts: ProviderPayout[];
}

export interface PayoutCreateInput {
    amountVnd: number;
    providerNote?: string;
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

export type MarketplaceListingPage = PageResponse<MarketplaceListing>;
export type AdminProviderPage = PageResponse<ProviderProfile>;
export type AdminPayoutPage = PageResponse<ProviderPayout>;
