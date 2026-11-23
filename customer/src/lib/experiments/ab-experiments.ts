'use client';

import {useEffect, useSyncExternalStore} from 'react';

export type AbVariant = 'control' | 'treatment';

export type AbExperimentKey =
    | 'in_place_booking_auth'
    | 'mobile_compact_filter_drawer'
    | 'localized_catalog_cards'
    | 'hero_trust_strip';

export interface AbExperimentMeta {
    key: AbExperimentKey;
    iceScore: number;
    defaultSplitPct: number;
    primaryMetric: string;
}

export const AB_EXPERIMENTS: Record<AbExperimentKey, AbExperimentMeta> = {
    in_place_booking_auth: {
        key: 'in_place_booking_auth',
        iceScore: 8.33,
        defaultSplitPct: 50,
        primaryMetric: 'auth_to_booking_rate',
    },
    mobile_compact_filter_drawer: {
        key: 'mobile_compact_filter_drawer',
        iceScore: 8.0,
        defaultSplitPct: 50,
        primaryMetric: 'catalog_card_ctr_mobile',
    },
    localized_catalog_cards: {
        key: 'localized_catalog_cards',
        iceScore: 8.0,
        defaultSplitPct: 50,
        primaryMetric: 'card_to_detail_rate',
    },
    hero_trust_strip: {
        key: 'hero_trust_strip',
        iceScore: 7.67,
        defaultSplitPct: 50,
        primaryMetric: 'hero_cta_ctr',
    },
};

const VISITOR_STORAGE_KEY = 'uav_ab_visitor_id';
const VISITOR_COOKIE_NAME = 'uav_ab_uid';
export const AB_EVENT_NAME = 'uav:ab-event';

/** FNV-1a 32-bit deterministic bucket in [0, 99]. */
export function hashBucket(seed: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % 100;
}

export function parseVariantToken(raw: string | null | undefined): AbVariant | null {
    if (!raw) return null;
    const norm = raw.trim().toLowerCase();
    if (norm === 'control' || norm === 'a' || norm === '0') return 'control';
    if (norm === 'treatment' || norm === 'b' || norm === '1') return 'treatment';
    return null;
}

export function readVariantOverride(search: string, key: AbExperimentKey): AbVariant | null {
    if (!search) return null;
    const params = new URLSearchParams(search);
    return (
        parseVariantToken(params.get(`ab_${key}`)) ??
        parseVariantToken(params.get('ab_all'))
    );
}

/** Deterministic sticky 50/50 variant assignment (honors explicit QA overrides). */
export function assignVariant(
    key: AbExperimentKey,
    visitorId: string,
    override?: AbVariant | null,
): AbVariant {
    if (override) return override;
    const split = AB_EXPERIMENTS[key]?.defaultSplitPct ?? 50;
    return hashBucket(`${key}:${visitorId}`) < split ? 'treatment' : 'control';
}

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function generateVisitorId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `v_${Date.now().toString(36)}_${Math.floor(performance.now() * 1000).toString(36)}`;
}

export function getOrCreateVisitorId(): string {
    if (typeof window === 'undefined') return 'ssr';
    try {
        const stored = window.localStorage.getItem(VISITOR_STORAGE_KEY) || readCookie(VISITOR_COOKIE_NAME);
        if (stored) return stored;
        const created = generateVisitorId();
        window.localStorage.setItem(VISITOR_STORAGE_KEY, created);
        document.cookie = `${VISITOR_COOKIE_NAME}=${encodeURIComponent(created)}; path=/; max-age=31536000; samesite=lax`;
        return created;
    } catch {
        return 'anon';
    }
}

export interface AbTrackPayload {
    experiment: AbExperimentKey;
    variant: AbVariant;
    event: string;
    timestamp: string;
    metadata?: Record<string, string | number | boolean | null | undefined>;
}

const exposedSet = new Set<string>();

export function trackAbEvent(
    experiment: AbExperimentKey,
    variant: AbVariant,
    event: string,
    metadata?: Record<string, string | number | boolean | null | undefined>,
): void {
    if (typeof window === 'undefined') return;
    const payload: AbTrackPayload = {
        experiment,
        variant,
        event,
        timestamp: new Date().toISOString(),
        metadata,
    };
    window.dispatchEvent(new CustomEvent<AbTrackPayload>(AB_EVENT_NAME, {detail: payload}));
    const w = window as Window & {
        dataLayer?: Array<Record<string, unknown>>;
        posthog?: {capture?: (name: string, props?: Record<string, unknown>) => void};
    };
    if (Array.isArray(w.dataLayer)) {
        w.dataLayer.push({...payload, event: `ab_${event}`});
    }
    w.posthog?.capture?.(`ab_${event}`, {...payload});
}

function subscribeAb(onStoreChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('popstate', onStoreChange);
    window.addEventListener('storage', onStoreChange);
    return () => {
        window.removeEventListener('popstate', onStoreChange);
        window.removeEventListener('storage', onStoreChange);
    };
}

function getClientVariant(key: AbExperimentKey): AbVariant {
    if (typeof window === 'undefined') return 'control';
    const override = readVariantOverride(window.location.search, key);
    return assignVariant(key, getOrCreateVisitorId(), override);
}

/**
 * SSR-safe React 19 hook returning the visitor's sticky A/B variant and logging one exposure event per session.
 * Override any variant in QA via `?ab_<key>=treatment|control` or `?ab_all=treatment|control`.
 */
export function useAbExperiment(key: AbExperimentKey): AbVariant {
    const variant = useSyncExternalStore<AbVariant>(
        subscribeAb,
        () => getClientVariant(key),
        (): AbVariant => 'control',
    );

    useEffect(() => {
        const dedupeKey = `${key}:${variant}`;
        if (exposedSet.has(dedupeKey)) return;
        exposedSet.add(dedupeKey);
        trackAbEvent(key, variant, 'exposure', {primaryMetric: AB_EXPERIMENTS[key].primaryMetric});
    }, [key, variant]);

    return variant;
}
