import type {FeatureGroup, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {formatPolygonVerticesText, type AirspaceZoneDraft} from '@/forms/airspace/airspace-zone-form';
import {MAP_BASEMAPS} from '@/lib/map-config';
import type {AirspaceZone} from '@/types/airspace/airspace.types';
import {AIRSPACE_ZONE_MAP_STYLES, buildAirspaceZoneTooltipHtml} from '@/utils/airspace/map-overlays';

type LeafletModule = typeof import('leaflet');
type TranslateFn = Parameters<typeof buildAirspaceZoneTooltipHtml>[1];
type FormatNumberFn = Parameters<typeof buildAirspaceZoneTooltipHtml>[2];

/**
 * Parses 1+ draft vertices so interactive map preview works from the very first click
 * (before reaching the 3-vertex minimum required for form submission).
 */
export function parseDraftVerticesPreview(raw: string): [number, number][] {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
        try {
            const parsed: unknown = JSON.parse(trimmed);
            if (!Array.isArray(parsed)) return [];
            const points: [number, number][] = [];
            for (const item of parsed) {
                if (!Array.isArray(item) || item.length < 2) continue;
                const lat = Number(item[0]);
                const lng = Number(item[1]);
                if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    points.push([Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6]);
                }
            }
            return points;
        } catch {
            return [];
        }
    }

    const lines = trimmed
        .split(/[\r\n;]+/)
        .map(line => line.trim())
        .filter(Boolean);
    const points: [number, number][] = [];
    for (const line of lines) {
        const parts = line.split(/[,\s]+/).filter(Boolean);
        if (parts.length < 2) continue;
        const lat = Number(parts[0]);
        const lng = Number(parts[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            points.push([Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6]);
        }
    }
    return points;
}

export function syncBasemapTileLayer(
    L: LeafletModule,
    map: LeafletMap,
    previousTile: TileLayer | null,
    basemap: keyof typeof MAP_BASEMAPS,
): TileLayer {
    previousTile?.remove();
    const spec = MAP_BASEMAPS[basemap];
    return L.tileLayer(spec.url, {
        maxZoom: spec.maxZoom,
        attribution: spec.attribution,
    }).addTo(map);
}

export function applyDraftMapClick(
    current: AirspaceZoneDraft,
    lat: number,
    lng: number,
): Partial<AirspaceZoneDraft> {
    const clickedLat = Math.round(lat * 1e6) / 1e6;
    const clickedLng = Math.round(lng * 1e6) / 1e6;
    if (current.geometryType === 'CIRCLE') {
        return {
            centerLat: clickedLat.toFixed(6),
            centerLng: clickedLng.toFixed(6),
        };
    }
    const existingPts = parseDraftVerticesPreview(current.verticesText);
    return {
        verticesText: formatPolygonVerticesText([...existingPts, [clickedLat, clickedLng]]),
    };
}

export function fitFeatureGroupBounds(
    map: LeafletMap,
    group: FeatureGroup,
    defaultCenter: [number, number],
    defaultZoom: number,
    padding = 0.18,
    maxZoom = 15,
): void {
    const bounds = group.getBounds();
    if (bounds.isValid()) {
        map.fitBounds(bounds.pad(padding), {maxZoom});
    } else {
        map.setView(defaultCenter, defaultZoom);
    }
}

export function renderOverviewZonesLayer(
    L: LeafletModule,
    group: FeatureGroup,
    zones: readonly AirspaceZone[],
    t: TranslateFn,
    formatNumber: FormatNumberFn,
    onSelectZone: (zone: AirspaceZone) => void,
): void {
    group.clearLayers();

    for (const zone of zones) {
        const baseStyle = AIRSPACE_ZONE_MAP_STYLES[zone.zoneType] ?? AIRSPACE_ZONE_MAP_STYLES.WARNING;
        const style = zone.active
            ? {...baseStyle, bubblingMouseEvents: false}
            : {...baseStyle, opacity: 0.45, fillOpacity: 0.05, dashArray: '4 6', bubblingMouseEvents: false};
        const tooltip = buildAirspaceZoneTooltipHtml(zone, t, formatNumber);

        if (zone.geometryType === 'CIRCLE') {
            const lat = Number(zone.centerLat);
            const lng = Number(zone.centerLng);
            const radius = Number(zone.radiusMeters);
            if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radius) && radius > 0) {
                L.circle([lat, lng], {...style, radius})
                    .bindTooltip(tooltip, {sticky: true})
                    .on('click', () => onSelectZone(zone))
                    .addTo(group);
            }
        } else if (zone.geometryType === 'POLYGON' && zone.vertices && zone.vertices.length >= 3) {
            const latLngs = zone.vertices
                .filter(v => Array.isArray(v) && v.length >= 2)
                .map((v): [number, number] => [Number(v[0]), Number(v[1])])
                .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
            if (latLngs.length >= 3) {
                L.polygon(latLngs, style)
                    .bindTooltip(tooltip, {sticky: true})
                    .on('click', () => onSelectZone(zone))
                    .addTo(group);
            }
        }
    }
}

export function renderNeighborZonesLayer(
    L: LeafletModule,
    bgGroup: LayerGroup,
    existingZones: readonly AirspaceZone[],
    editingZoneId?: number | null,
): void {
    bgGroup.clearLayers();

    for (const z of existingZones) {
        if (!z.active || z.id === editingZoneId) continue;
        const base = AIRSPACE_ZONE_MAP_STYLES[z.zoneType] ?? AIRSPACE_ZONE_MAP_STYLES.WARNING;
        const mutedStyle = {...base, weight: 1, opacity: 0.35, fillOpacity: 0.05, interactive: false};
        if (z.geometryType === 'CIRCLE' && z.radiusMeters && z.radiusMeters > 0) {
            L.circle([z.centerLat, z.centerLng], {...mutedStyle, radius: z.radiusMeters}).addTo(bgGroup);
        } else if (z.geometryType === 'POLYGON' && z.vertices && z.vertices.length >= 3) {
            const pts = z.vertices
                .filter(v => Array.isArray(v) && v.length >= 2)
                .map((v): [number, number] => [Number(v[0]), Number(v[1])]);
            if (pts.length >= 3) {
                L.polygon(pts, mutedStyle).addTo(bgGroup);
            }
        }
    }
}

export function renderDraftGeometryLayer(
    L: LeafletModule,
    fgGroup: FeatureGroup,
    draft: AirspaceZoneDraft,
    polygonPoints: readonly [number, number][],
): void {
    fgGroup.clearLayers();

    const style = AIRSPACE_ZONE_MAP_STYLES[draft.zoneType] ?? AIRSPACE_ZONE_MAP_STYLES.RESTRICTED;
    const strokeColor = style.color ?? '#d97706';

    if (draft.geometryType === 'CIRCLE') {
        const lat = Number(draft.centerLat);
        const lng = Number(draft.centerLng);
        const radius = Number(draft.radiusMeters);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            if (Number.isFinite(radius) && radius >= 10) {
                L.circle([lat, lng], {...style, radius, fillOpacity: 0.2, interactive: false}).addTo(fgGroup);
            }
            L.circleMarker([lat, lng], {
                radius: 7,
                color: '#ffffff',
                weight: 2.5,
                fillColor: strokeColor,
                fillOpacity: 1,
                interactive: false,
            }).addTo(fgGroup);
        }
        return;
    }

    if (polygonPoints.length >= 3) {
        L.polygon([...polygonPoints], {...style, fillOpacity: 0.2, interactive: false}).addTo(fgGroup);
    } else if (polygonPoints.length === 2) {
        L.polyline([...polygonPoints], {color: strokeColor, weight: 2, dashArray: '5 5', interactive: false}).addTo(fgGroup);
    }

    polygonPoints.forEach(([lat, lng], idx) => {
        L.marker([lat, lng], {
            icon: L.divIcon({
                className: '',
                iconSize: [22, 22],
                iconAnchor: [11, 11],
                html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${strokeColor};color:#fff;border:2px solid #fff;font:700 10px/1 system-ui,sans-serif;box-shadow:0 1px 3px rgba(15,23,42,.35)">${idx + 1}</span>`,
            }),
            interactive: false,
        }).addTo(fgGroup);
    });
}
