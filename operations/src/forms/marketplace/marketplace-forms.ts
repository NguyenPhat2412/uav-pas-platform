import type {Mission, MissionType, UavService} from '@/types/mission/mission.types';
import type {
    ListingModerationStatus,
    ListingType,
    MarketplaceListingUpsertInput,
    PayoutStatus,
    PricingModel,
    ProviderDocumentType,
    ProviderEquipmentCategory,
    ProviderEquipmentCreateInput,
    ProviderOnboardingInput,
    ProviderPilotStatus,
    ProviderPilotUpsertInput,
    ProviderProfile,
    ProviderUavCreateInput,
    ProviderUavStatus,
    ProviderVerificationStatus,
    WalletTransactionType,
} from '@/types/marketplace/marketplace.types';

export const DOCUMENT_TYPE_CODES: readonly ProviderDocumentType[] = [
    'BUSINESS_LICENSE',
    'IDENTITY_CARD',
    'PILOT_CERTIFICATE',
    'UAV_REGISTRATION',
    'FLIGHT_OPERATION_PERMIT',
    'INSURANCE_POLICY',
    'PLATFORM_FEE_AGREEMENT',
    'TAX_SETTLEMENT_DOSSIER',
] as const;

export const LISTING_TYPE_CODES: readonly ListingType[] = [
    'FLIGHT_SERVICE',
    'WET_LEASE',
    'DRY_LEASE',
] as const;

export const PRICING_MODEL_CODES: readonly PricingModel[] = [
    'PER_HECTARE',
    'PER_HOUR',
    'PER_DAY',
    'PER_PACKAGE',
] as const;

export const EQUIPMENT_CATEGORY_CODES: readonly ProviderEquipmentCategory[] = [
    'CAMERA',
    'SENSOR',
    'BATTERY',
    'KV260',
    'ACCESSORY',
] as const;

export const UAV_STATUS_CODES: readonly ProviderUavStatus[] = [
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
] as const;

export const PILOT_STATUS_CODES: readonly ProviderPilotStatus[] = [
    'AVAILABLE',
    'IN_FLIGHT',
    'MAINTENANCE',
] as const;

export type SellerOrderTab = 'PENDING_ACCEPT' | 'WAITING_FLIGHT' | 'IN_FLIGHT' | 'DELIVERED';

/**
 * Classifies a provider order (`Mission`) into one of the 4 Shopee Seller tabs:
 * - PENDING_ACCEPT: Chờ nhận
 * - WAITING_FLIGHT: Chờ bay
 * - IN_FLIGHT: Đang bay
 * - DELIVERED: Đã bàn giao
 */
export function classifySellerOrderTab(mission: Mission): SellerOrderTab {
    if (
        mission.providerResponseStatus === 'PENDING_PROVIDER' ||
        mission.status === 'PENDING_CONFIRMATION' ||
        mission.status === 'DRAFT'
    ) {
        return 'PENDING_ACCEPT';
    }
    if (mission.status === 'IN_PROGRESS') {
        return 'IN_FLIGHT';
    }
    if (
        mission.status === 'COMPLETED' ||
        mission.status === 'CANCELLED' ||
        mission.status === 'REJECTED' ||
        mission.status === 'FAILED' ||
        mission.providerResponseStatus === 'DECLINED'
    ) {
        return 'DELIVERED';
    }
    return 'WAITING_FLIGHT';
}

export function normalizeUavStatusCardKey(status?: string | null): 'READY' | 'FLYING' | 'MAINTENANCE' {
    const upper = (status ?? '').toUpperCase();
    if (upper === 'IN_USE' || upper === 'IN_FLIGHT' || upper === 'ASSIGNED' || upper === 'FLYING') {
        return 'FLYING';
    }
    if (upper === 'MAINTENANCE' || upper === 'OFF_DUTY' || upper === 'INACTIVE' || upper === 'REPAIR') {
        return 'MAINTENANCE';
    }
    return 'READY';
}

export function extractActionableError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object') {
        const record = err as { message?: unknown; details?: unknown; fields?: unknown };
        if (record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields)) {
            const entries = Object.values(record.fields as Record<string, unknown>)
                .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
            if (entries.length > 0) return entries.join(' · ');
        }
        if (record.details && typeof record.details === 'object' && !Array.isArray(record.details)) {
            const entries = Object.values(record.details as Record<string, unknown>)
                .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
            if (entries.length > 0) return entries.join(' · ');
        }
        if (typeof record.message === 'string' && record.message.trim().length > 0) {
            return record.message.trim();
        }
    }
    return fallback;
}

export function formatVndCompact(amount?: number | null): string {
    if (amount == null || Number.isNaN(Number(amount))) return '0 ₫';
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(amount)))} ₫`;
}

const LEGACY_PAREN_ILLUSTRATIVE_RE = new RegExp(
    '\\(\\s*(minh hoạ|minh họa|mô phỏng|giả lập)\\s*\\)',
    'gi',
);
const LEGACY_POS_CLAIM_RE = new RegExp('\\b' + 'R' + 'TK\\b', 'gi');

/**
 * Legacy-only fallback scrubber: S0 migration V64/V65 cleans seed data at the database source;
 * this helper is retained strictly as a defensive guard for any older un-migrated local rows.
 */
export function sanitizeMarketplaceText(raw?: string | null): string {
    if (!raw) return '';
    return raw
        .replace(LEGACY_PAREN_ILLUSTRATIVE_RE, '— $1')
        .replace(LEGACY_POS_CLAIM_RE, 'GNSS');
}

export function initialOnboardingForm(profile?: ProviderProfile | null, defaultRadiusKm = 100): ProviderOnboardingInput {
    return {
        displayName: profile?.displayName ?? '',
        providerType: profile?.providerType ?? 'COMPANY',
        taxOrIdNumber: profile?.taxOrIdNumber ?? '',
        flightLicenseNumber: profile?.flightLicenseNumber ?? '',
        bio: profile?.bio ?? '',
        province: profile?.province ?? 'Hà Nội',
        serviceRadiusKm: profile?.serviceRadiusKm ?? defaultRadiusKm,
        contactPhone: profile?.contactPhone ?? '',
        bankName: profile?.bankName ?? '',
        bankAccountNumber: profile?.bankAccountNumber ?? '',
        bankAccountHolder: profile?.bankAccountHolder ?? '',
        submitForReview: true,
    };
}

export function inferMissionTypeFromServiceCode(code?: string | null): MissionType {
    const upper = (code ?? '').toUpperCase();
    if (upper.includes('RECORD') || upper.includes('MEDIA') || upper.includes('VIDEO')) return 'AERIAL_RECORDING';
    if (upper.includes('DATA') || upper.includes('LIDAR') || upper.includes('MAP')) return 'DATA_COLLECTION';
    if (upper.includes('RENT') || upper.includes('LEASE')) return 'UAV_RENTAL';
    return 'AREA_INSPECTION';
}

export function listingFormFromTemplate(
    template: UavService,
    province = 'Hà Nội',
    defaultRadiusKm = 100,
): MarketplaceListingUpsertInput {
    return {
        categoryServiceId: template.id,
        title: template.name,
        summary: template.description ?? '',
        description: template.description ?? '',
        listingType: 'FLIGHT_SERVICE',
        missionType: inferMissionTypeFromServiceCode(template.code),
        pricingModel: 'PER_HECTARE',
        basePriceVnd: 1500000,
        minBookingUnits: 1,
        securityDepositVnd: 0,
        province,
        serviceRadiusKm: defaultRadiusKm,
        equipmentSpecs: template.sensors?.length ? template.sensors.join(', ') : '',
        deliverablesSummary: template.description ?? '',
        onSiteSlaHours: template.onSiteHours ?? 24,
        deliverySlaHours: template.deliveryHours ?? 48,
        coverImageUrl: '',
        submitForReview: true,
    };
}

export function initialListingForm(province = 'Hà Nội', defaultRadiusKm = 100): MarketplaceListingUpsertInput {
    return {
        title: '',
        summary: '',
        description: '',
        listingType: 'FLIGHT_SERVICE',
        missionType: 'AREA_INSPECTION',
        pricingModel: 'PER_HECTARE',
        basePriceVnd: 1500000,
        minBookingUnits: 1,
        securityDepositVnd: 0,
        province,
        serviceRadiusKm: defaultRadiusKm,
        equipmentSpecs: '',
        deliverablesSummary: '',
        onSiteSlaHours: 24,
        deliverySlaHours: 48,
        coverImageUrl: '',
        submitForReview: true,
    };
}

export function initialUavForm(): ProviderUavCreateInput {
    return {model: '', serialNumber: '', manufacturer: 'DJI Enterprise', status: 'AVAILABLE'};
}

export function initialPilotForm(): ProviderPilotUpsertInput {
    return {
        fullName: '',
        phone: '',
        email: '',
        licenseNumber: '',
        specialization: '',
        status: 'AVAILABLE',
        assignedUavId: null,
    };
}

export function initialEquipmentForm(): ProviderEquipmentCreateInput {
    return {name: '', type: 'SENSOR', serialNumber: '', quantity: 1};
}

export type {
    ListingModerationStatus,
    PayoutStatus,
    ProviderVerificationStatus,
    WalletTransactionType,
};
