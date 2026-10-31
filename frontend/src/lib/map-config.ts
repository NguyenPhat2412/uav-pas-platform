'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {Control, Map as LeafletMap} from 'leaflet';
import {fetchPublicSiteInfo} from '@/api/settings/platform-settings.api';
import type {Basemap} from '@/types';

export const MAP_BASEMAP_ORDER: readonly Basemap[] = ['streets', 'satellite', 'terrain', 'dark'] as const;

export const MAP_BASEMAPS: Record<Basemap, { url: string; attribution: string; maxZoom: number }> = {
    streets: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
    },
    terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
        maxZoom: 17,
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
    },
};

export interface PlatformMapConfig {
    defaultBasemap: Basemap;
    defaultCenter: [number, number];
    defaultZoom: number;
    showScaleBar: boolean;
    showStationRadius: boolean;
    stationCoverageRadiusMeters: number;
}

export const DEFAULT_PLATFORM_MAP_CONFIG: PlatformMapConfig = {
    defaultBasemap: 'streets',
    defaultCenter: [21.0136, 105.5259],
    defaultZoom: 12,
    showScaleBar: true,
    showStationRadius: true,
    stationCoverageRadiusMeters: 5000,
};

function isBasemap(value: string | undefined): value is Basemap {
    return value === 'streets' || value === 'satellite' || value === 'terrain' || value === 'dark';
}

function parseNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
    if (!raw) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
    return parsed;
}

export function parsePlatformMapConfig(settings?: Record<string, string> | null): PlatformMapConfig {
    if (!settings) return DEFAULT_PLATFORM_MAP_CONFIG;
    const rawBasemap = settings['map.default_basemap'];
    const lat = parseNumber(settings['map.default_center_lat'], DEFAULT_PLATFORM_MAP_CONFIG.defaultCenter[0], -90, 90);
    const lng = parseNumber(settings['map.default_center_lng'], DEFAULT_PLATFORM_MAP_CONFIG.defaultCenter[1], -180, 180);
    const zoom = Math.round(parseNumber(settings['map.default_zoom'], DEFAULT_PLATFORM_MAP_CONFIG.defaultZoom, 4, 19));
    const showScaleBar = settings['map.show_scale_bar'] ? settings['map.show_scale_bar'] === 'true' : DEFAULT_PLATFORM_MAP_CONFIG.showScaleBar;
    const showStationRadius = settings['map.show_station_radius']
        ? settings['map.show_station_radius'] === 'true'
        : DEFAULT_PLATFORM_MAP_CONFIG.showStationRadius;
    const stationCoverageRadiusMeters = Math.round(
        parseNumber(settings['map.station_coverage_radius_m'], DEFAULT_PLATFORM_MAP_CONFIG.stationCoverageRadiusMeters, 500, 50000),
    );

    return {
        defaultBasemap: isBasemap(rawBasemap) ? rawBasemap : DEFAULT_PLATFORM_MAP_CONFIG.defaultBasemap,
        defaultCenter: [lat, lng],
        defaultZoom: zoom,
        showScaleBar,
        showStationRadius,
        stationCoverageRadiusMeters,
    };
}

const MAP_PREFS_KEY = 'uav_map_prefs';

interface MapPrefs {
    basemap?: Basemap;
    showStationRadius?: boolean;
}

function readMapPrefs(): MapPrefs {
    try {
        const raw: unknown = JSON.parse(localStorage.getItem(MAP_PREFS_KEY) ?? '{}');
        if (!raw || typeof raw !== 'object') return {};
        const {basemap, showStationRadius} = raw as Record<string, unknown>;
        return {
            basemap: typeof basemap === 'string' && isBasemap(basemap) ? basemap : undefined,
            showStationRadius: typeof showStationRadius === 'boolean' ? showStationRadius : undefined,
        };
    } catch {
        return {};
    }
}

function writeMapPrefs(change: MapPrefs) {
    try {
        localStorage.setItem(MAP_PREFS_KEY, JSON.stringify({...readMapPrefs(), ...change}));
    } catch {
        // storage unavailable: the choice still applies for this visit
    }
}

export function useMapConfig() {
    const siteInfoQuery = useQuery({
        queryKey: ['public', 'site-info'],
        queryFn: ({signal}) => fetchPublicSiteInfo(signal),
        staleTime: 60_000,
    });

    const config = useMemo(
        () => parsePlatformMapConfig(siteInfoQuery.data?.settings),
        [siteInfoQuery.data?.settings],
    );

    // A user's own basemap and station-range choice is kept in this browser and wins over the
    // system default from Settings; with no choice saved, the system default applies.
    const [userBasemap, setUserBasemap] = useState<Basemap | null>(null);
    const [userShowStationRadius, setUserShowStationRadius] = useState<boolean | null>(null);

    useEffect(() => {
        const saved = readMapPrefs();
        if (saved.basemap) setUserBasemap(saved.basemap);
        if (saved.showStationRadius !== undefined) setUserShowStationRadius(saved.showStationRadius);
    }, []);

    const basemap: Basemap = userBasemap ?? config.defaultBasemap;
    const showStationRadius: boolean = userShowStationRadius ?? config.showStationRadius;

    const setBasemap = useCallback((next: Basemap) => {
        setUserBasemap(next);
        writeMapPrefs({basemap: next});
    }, []);
    const setShowStationRadius = useCallback((next: boolean) => {
        setUserShowStationRadius(next);
        writeMapPrefs({showStationRadius: next});
    }, []);

    return {
        config,
        basemap,
        setBasemap,
        tileSpec: MAP_BASEMAPS[basemap],
        showStationRadius,
        setShowStationRadius,
    };
}

export function syncScaleControl(
    L: typeof import('leaflet'),
    map: LeafletMap,
    scaleRef: { current: Control.Scale | null },
    enabled: boolean,
) {
    if (enabled && !scaleRef.current) {
        scaleRef.current = L.control.scale({metric: true, imperial: false, position: 'bottomright'}).addTo(map);
    } else if (!enabled && scaleRef.current) {
        scaleRef.current.remove();
        scaleRef.current = null;
    }
}
