import type {MissionType, PageResponse} from '@/types/mission/mission.types';

export type ProviderType = 'INDIVIDUAL' | 'COMPANY';
export type ProviderVerificationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type ProviderDocumentType =
    | 'IDENTITY_CARD'
    | 'BUSINESS_LICENSE'
    | 'PILOT_CERTIFICATE'
    | 'UAV_REGISTRATION'
    | 'INSURANCE_POLICY'
    | 'FLIGHT_OPERATION_PERMIT'
    | 'PLATFORM_FEE_AGREEMENT'
    | 'TAX_SETTLEMENT_DOSSIER';
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
export type ProviderUavStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
export type ProviderPilotStatus = 'AVAILABLE' | 'IN_FLIGHT' | 'MAINTENANCE' | 'OFF_DUTY';

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

export interface MarketplaceListingFromTemplateInput {
    serviceOfferingId: number;
    title?: string;
    summary?: string;
    province: string;
    serviceRadiusKm?: number;
    basePriceVnd: number;
    pricingModel?: PricingModel;
    minBookingUnits?: number;
    deliverySlaHours?: number;
    onSiteSlaHours?: number;
    equipmentSpecs?: string;
    deliverablesSummary?: string;
    coverImageUrl?: string;
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
    status?: ProviderUavStatus;
}

export interface ProviderUavUpdateInput {
    model?: string;
    serialNumber?: string;
    manufacturer?: string;
    status?: ProviderUavStatus;
}

export interface ProviderEquipmentCreateInput {
    name: string;
    type: ProviderEquipmentCategory;
    serialNumber?: string;
    quantity: number;
}

export interface ProviderPilot {
    id: number;
    providerId?: number | null;
    userId?: number | null;
    pilotUserId?: number | null;
    username?: string | null;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    licenseNumber?: string | null;
    specialization?: string | null;
    status: ProviderPilotStatus | string;
    assignedUavId?: number | null;
    assignedUavModel?: string | null;
    completedMissionsCount?: number;
    createdAt?: string;
}

export interface ProviderPilotUpsertInput {
    userId?: number;
    fullName: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    specialization?: string;
    status?: ProviderPilotStatus;
    assignedUavId?: number | null;
}

export interface ProviderOrderActionInput {
    accept: boolean;
    uavId?: number;
    pilotUserId?: number;
    reason?: string;
    responseNote?: string;
}

export interface ProviderOrderAssignInput {
    pilotId?: number;
    pilotUserId?: number;
    uavId: number;
    note?: string;
}

export interface ProviderOrderCompleteInput {
    completionNote: string;
    equipmentCondition?: string;
    mediaIds?: number[];
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

export type MarketplaceListingPage = PageResponse<MarketplaceListing>;
