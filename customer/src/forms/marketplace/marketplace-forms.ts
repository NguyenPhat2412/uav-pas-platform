import type {
    EscrowStatus,
    ListingModerationStatus,
    ListingSortOption,
    ListingType,
    MarketplaceListingUpsertInput,
    MissionBidCreateInput,
    PayoutStatus,
    PricingModel,
    ProviderDocumentType,
    ProviderEquipmentCategory,
    ProviderEquipmentCreateInput,
    ProviderOnboardingInput,
    ProviderOrderStatus,
    ProviderProfile,
    ProviderUavCreateInput,
    ProviderVerificationStatus,
    WalletTransactionType,
} from '@/types/marketplace/marketplace.types';

export const LISTING_SORT_OPTIONS: { value: ListingSortOption; label: string }[] = [
    {value: 'featured', label: 'Đề xuất & Nổi bật'},
    {value: 'rating', label: 'Đánh giá cao nhất'},
    {value: 'price_asc', label: 'Đơn giá thấp → cao'},
    {value: 'price_desc', label: 'Đơn giá cao → thấp'},
];

export const LISTING_TYPE_OPTIONS: { value: ListingType; label: string; hint: string }[] = [
    {
        value: 'FLIGHT_SERVICE',
        label: 'Dịch vụ bay trọn gói',
        hint: 'Đối tác thực hiện bay khảo sát / quay chụp và bàn giao dữ liệu hoàn chỉnh.',
    },
    {
        value: 'WET_LEASE',
        label: 'Thuê UAV kèm phi công',
        hint: 'Thuê tổ máy bay + phi công điều khiển theo ca/giờ hoặc theo ngày tại hiện trường.',
    },
    {
        value: 'DRY_LEASE',
        label: 'Thuê thiết bị tự vận hành',
        hint: 'Thuê thân máy bay UAV, pin hoặc cảm biến chuyên dụng kèm tiền cọc thiết bị.',
    },
];

export const PRICING_MODEL_OPTIONS: { value: PricingModel; label: string; unitShort: string }[] = [
    {value: 'PER_HOUR', label: 'Theo giờ bay', unitShort: 'giờ'},
    {value: 'PER_HECTARE', label: 'Theo diện tích (ha)', unitShort: 'ha'},
    {value: 'PER_DAY', label: 'Theo ngày thuê', unitShort: 'ngày'},
    {value: 'PER_PACKAGE', label: 'Trọn gói nhiệm vụ', unitShort: 'gói'},
];

export const DOCUMENT_TYPE_OPTIONS: { value: ProviderDocumentType; label: string }[] = [
    {value: 'IDENTITY_CARD', label: 'CCCD / Hộ chiếu người đại diện'},
    {value: 'BUSINESS_LICENSE', label: 'Giấy phép đăng ký doanh nghiệp'},
    {value: 'PILOT_CERTIFICATE', label: 'Chứng chỉ điều khiển UAV / Phi công'},
    {value: 'UAV_REGISTRATION', label: 'Hồ sơ đăng ký tàu bay / Serial UAV'},
    {value: 'INSURANCE_POLICY', label: 'Bảo hiểm trách nhiệm dân sự bay'},
];

export const EQUIPMENT_CATEGORY_OPTIONS: { value: ProviderEquipmentCategory; label: string }[] = [
    {value: 'CAMERA', label: 'Camera quang học / Gimbal'},
    {value: 'SENSOR', label: 'Cảm biến LiDAR / Đa phổ / Nhiệt'},
    {value: 'BATTERY', label: 'Pin thông minh & Trạm sạc'},
    {value: 'KV260', label: 'Bộ xử lý biên KV260'},
    {value: 'ACCESSORY', label: 'Phụ kiện RTK / Trạm gốc GNSS'},
];

export function listingTypeLabel(type?: ListingType | null): string {
    return LISTING_TYPE_OPTIONS.find(item => item.value === type)?.label ?? 'Dịch vụ UAV';
}

export function pricingUnitLabel(model?: PricingModel | null): string {
    return PRICING_MODEL_OPTIONS.find(item => item.value === model)?.unitShort ?? 'đơn vị';
}

export function pricingModelLabel(model?: PricingModel | null): string {
    return PRICING_MODEL_OPTIONS.find(item => item.value === model)?.label ?? 'Theo đơn vị';
}

export function verificationStatusLabel(status?: ProviderVerificationStatus | null): string {
    switch (status) {
        case 'VERIFIED':
            return 'Đã xác minh KYC';
        case 'PENDING_REVIEW':
            return 'Đang chờ duyệt';
        case 'REJECTED':
            return 'Cần bổ sung hồ sơ';
        case 'SUSPENDED':
            return 'Tạm ngưng hoạt động';
        default:
            return 'Bản nháp hồ sơ';
    }
}

export function moderationStatusLabel(status?: ListingModerationStatus | null): string {
    switch (status) {
        case 'PUBLISHED':
            return 'Đang hiển thị trên sàn';
        case 'PENDING_REVIEW':
            return 'Chờ quản trị duyệt';
        case 'PAUSED':
            return 'Đang tạm ẩn';
        case 'REJECTED':
            return 'Từ chối duyệt';
        default:
            return 'Bản nháp';
    }
}

export function providerOrderStatusLabel(status?: ProviderOrderStatus | null): string {
    switch (status) {
        case 'OPEN_RFQ':
            return 'Đang mở nhận báo giá (RFQ)';
        case 'PENDING_PROVIDER':
            return 'Chờ đối tác phản hồi';
        case 'ACCEPTED':
            return 'Đối tác đã nhận đơn';
        case 'DECLINED':
            return 'Đối tác từ chối';
        default:
            return 'Điều phối tiêu chuẩn';
    }
}

export function walletTxLabel(type: WalletTransactionType): string {
    switch (type) {
        case 'ESCROW_HOLD':
            return 'Khách nạp tiền ký quỹ (Escrow)';
        case 'ESCROW_RELEASE':
            return 'Giải phóng doanh thu sau nghiệm thu';
        case 'PAYOUT_REQUEST':
            return 'Tạo lệnh rút tiền về ngân hàng';
        case 'PAYOUT_COMPLETED':
            return 'Đã chuyển khoản giải ngân';
        case 'PAYOUT_REJECTED':
            return 'Hoàn số dư do từ chối lệnh rút';
        case 'ESCROW_REFUND':
            return 'Hoàn tiền ký quỹ cho khách';
    }
}

export function payoutStatusLabel(status: PayoutStatus): string {
    switch (status) {
        case 'PAID':
            return 'Đã giải ngân';
        case 'REJECTED':
            return 'Từ chối (Đã hoàn ví)';
        default:
            return 'Chờ kế toán duyệt';
    }
}

export function escrowStatusLabel(status?: EscrowStatus | null): string {
    switch (status) {
        case 'UNFUNDED':
            return 'Chờ nạp Ký quỹ VietQR';
        case 'HELD':
            return 'Đang giữ Ký quỹ an toàn';
        case 'DISPUTED':
            return 'Đang khóa Ký quỹ chờ bổ sung bàn giao';
        case 'RELEASED':
            return 'Đã giải ngân sau nghiệm thu';
        case 'REFUNDED':
            return 'Đã hủy / Hoàn Ký quỹ';
        default:
            return 'Chưa phát hành Ký quỹ';
    }
}

export function extractActionableError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object') {
        const record = err as { message?: unknown; details?: unknown };
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
    if (amount == null || Number.isNaN(Number(amount))) return 'Liên hệ';
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(amount)))} ₫`;
}

export function estimateBookingSubtotal(basePriceVnd: number, units: number, minUnits = 1): number {
    const effectiveUnits = Math.max(Number.isFinite(units) ? units : minUnits, minUnits, 0.5);
    return Math.round(basePriceVnd * effectiveUnits);
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
        submitForReview: true,
    };
}

export function initialUavForm(): ProviderUavCreateInput {
    return {model: '', serialNumber: '', manufacturer: 'DJI Enterprise'};
}

export function initialEquipmentForm(): ProviderEquipmentCreateInput {
    return {name: '', type: 'SENSOR', serialNumber: '', quantity: 1};
}

export function initialBidForm(): MissionBidCreateInput {
    return {
        proposedPriceVnd: 2500000,
        estimatedDeliveryHours: 24,
        proposedUavModel: '',
        proposalNote: '',
    };
}
