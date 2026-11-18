'use client';

import {useEffect, useState} from 'react';
import {fetchPublicSiteInfo} from '@/api/settings/platform-settings.api';
import type {PublicSiteInfo} from '@/types/settings/platform-settings.types';

// Shared across consumers with a short freshness window so live Admin setting updates propagate on tab focus.
let cached: PublicSiteInfo | null | undefined;
let cachedAt = 0;
let inflight: Promise<PublicSiteInfo | null> | undefined;
const STALE_MS = 15_000;

export function refreshSiteInfo() {
    cached = undefined;
    cachedAt = 0;
    inflight = undefined;
}

function load(force = false) {
    if (!force && cached !== undefined && Date.now() - cachedAt < STALE_MS) {
        return Promise.resolve(cached);
    }
    inflight ??= fetchPublicSiteInfo()
        .then(info => {
            cached = info;
            cachedAt = Date.now();
            inflight = undefined;
            return info;
        })
        .catch(() => {
            inflight = undefined;
            return cached ?? null;
        });
    return inflight;
}

function parseNumberSetting(raw: string | undefined, fallback: number, min?: number, max?: number): number {
    if (raw == null || raw.trim() === '') return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    if (min != null && n < min) return fallback;
    if (max != null && n > max) return fallback;
    return n;
}

function parseBoolSetting(raw: string | undefined, fallback: boolean): boolean {
    if (raw == null || raw.trim() === '') return fallback;
    const v = raw.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    return fallback;
}

/**
 * Public contact details and dynamic marketplace/billing parameters from admin settings,
 * falling back to build-time env/default values so SSR markup stays stable until the API answers.
 */
export function useSiteInfo() {
    const [info, setInfo] = useState<PublicSiteInfo | null | undefined>(cached);
    useEffect(() => {
        let active = true;
        const sync = (force = false) => {
            void load(force).then(value => {
                if (active) setInfo(value);
            });
        };
        sync();
        const onFocus = () => {
            if (Date.now() - cachedAt >= STALE_MS) sync(true);
        };
        window.addEventListener('focus', onFocus);
        return () => {
            active = false;
            window.removeEventListener('focus', onFocus);
        };
    }, []);
    const settings = info?.settings ?? {};
    const envHotline = process.env.NEXT_PUBLIC_DISPATCH_HOTLINE?.trim() || undefined;
    const envZalo = process.env.NEXT_PUBLIC_ZALO_PHONE?.trim() || undefined;
    return {
        dispatchHotline: info?.dispatchHotline?.trim() || envHotline,
        zaloPhone: info?.zaloPhone?.trim() || envZalo,
        email: info?.email?.trim() || undefined,
        address: info?.address?.trim() || undefined,
        platformFeeRate: parseNumberSetting(settings['marketplace.platform_fee_rate'], 0.1, 0, 0.5),
        proFeeRate: parseNumberSetting(settings['marketplace.pro_fee_rate'], 0.06, 0, 0.5),
        enterpriseFeeRate: parseNumberSetting(settings['marketplace.enterprise_fee_rate'], 0.03, 0, 0.5),
        minPayoutVnd: parseNumberSetting(settings['marketplace.min_payout_vnd'], 100_000, 10_000),
        maxPayoutVnd: parseNumberSetting(settings['marketplace.max_payout_vnd'], 500_000_000, 50_000),
        defaultServiceRadiusKm: parseNumberSetting(settings['marketplace.default_service_radius_km'], 100, 5, 2000),
        rfqEnabled: parseBoolSetting(settings['marketplace.rfq_enabled'], true),
        requireEscrowBeforeStart: parseBoolSetting(settings['marketplace.require_escrow_before_start'], false),
        invoiceDueDays: parseNumberSetting(settings['billing.invoice_due_days'], 7, 1, 90),
        loaded: info !== undefined,
    };
}
