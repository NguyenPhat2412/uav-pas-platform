import type {PublicSiteInfo} from '@/shared/types/settings/platform-settings.types';

export interface ParsedSiteInfo {
    dispatchHotline?: string;
    zaloPhone?: string;
    email?: string;
    address?: string;
    platformFeeRate: number;
    minPayoutVnd: number;
    maxPayoutVnd: number;
    defaultServiceRadiusKm: number;
    rfqEnabled: boolean;
    requireEscrowBeforeStart: boolean;
    invoiceDueDays: number;
}

export function parseNumberSetting(
    raw: string | undefined,
    fallback: number,
    min?: number,
    max?: number,
): number {
    if (raw == null || raw.trim() === '') return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    if (min != null && parsed < min) return fallback;
    if (max != null && parsed > max) return fallback;
    return parsed;
}

export function parseBoolSetting(raw: string | undefined, fallback: boolean): boolean {
    if (raw == null || raw.trim() === '') return fallback;
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return fallback;
}

export function parseSiteInfo(info: PublicSiteInfo | null | undefined): ParsedSiteInfo {
    const settings = info?.settings ?? {};
    return {
        dispatchHotline: info?.dispatchHotline?.trim() || undefined,
        zaloPhone: info?.zaloPhone?.trim() || undefined,
        email: info?.email?.trim() || undefined,
        address: info?.address?.trim() || undefined,
        platformFeeRate: parseNumberSetting(settings['marketplace.platform_fee_rate'], 0.1, 0, 0.5),
        minPayoutVnd: parseNumberSetting(settings['marketplace.min_payout_vnd'], 100_000, 10_000),
        maxPayoutVnd: parseNumberSetting(settings['marketplace.max_payout_vnd'], 500_000_000, 50_000),
        defaultServiceRadiusKm: parseNumberSetting(
            settings['marketplace.default_service_radius_km'],
            100,
            5,
            2000,
        ),
        rfqEnabled: parseBoolSetting(settings['marketplace.rfq_enabled'], false),
        requireEscrowBeforeStart: parseBoolSetting(
            settings['marketplace.require_escrow_before_start'],
            false,
        ),
        invoiceDueDays: parseNumberSetting(settings['billing.invoice_due_days'], 7, 1, 90),
    };
}
