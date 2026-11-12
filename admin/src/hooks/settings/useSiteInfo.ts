'use client';

import {useEffect, useState} from 'react';
import {fetchPublicSiteInfo} from '@/api/settings/platform-settings.api';
import type {PublicSiteInfo} from '@/types/settings/platform-settings.types';

// One request per page load, shared by every consumer.
let cached: PublicSiteInfo | null | undefined;
let inflight: Promise<PublicSiteInfo | null> | undefined;

function load() {
    if (cached !== undefined) return Promise.resolve(cached);
    inflight ??= fetchPublicSiteInfo().then(info => {
        cached = info;
        return info;
    });
    return inflight;
}

/**
 * Public contact details from the admin settings, falling back to build-time env values. The first
 * render (including SSR) uses the env fallback, so markup stays stable until the API answers.
 */
export function useSiteInfo() {
    const [info, setInfo] = useState<PublicSiteInfo | null | undefined>(cached);
    useEffect(() => {
        let active = true;
        void load().then(value => {
            if (active) setInfo(value);
        });
        return () => {
            active = false;
        };
    }, []);
    const envHotline = process.env.NEXT_PUBLIC_DISPATCH_HOTLINE?.trim() || undefined;
    const envZalo = process.env.NEXT_PUBLIC_ZALO_PHONE?.trim() || undefined;
    return {
        dispatchHotline: info?.dispatchHotline?.trim() || envHotline,
        zaloPhone: info?.zaloPhone?.trim() || envZalo,
        email: info?.email?.trim() || undefined,
        address: info?.address?.trim() || undefined,
        loaded: info !== undefined,
    };
}
