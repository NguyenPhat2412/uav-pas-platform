import type {LayerGroup, PathOptions} from 'leaflet';
import type {Translate} from '@/types';
import type {AirspaceZone, AirspaceZoneType} from '@/types/airspace/airspace.types';

export const AIRSPACE_ZONE_MAP_STYLES: Record<AirspaceZoneType, PathOptions> = {
    PROHIBITED: {
        color: '#ab2523',
        weight: 2,
        fillColor: '#dc2626',
        fillOpacity: 0.16,
        bubblingMouseEvents: true,
    },
    RESTRICTED: {
        color: '#d97706',
        weight: 2,
        dashArray: '6 4',
        fillColor: '#d97706',
        fillOpacity: 0.12,
        bubblingMouseEvents: true,
    },
    WARNING: {
        color: '#2563eb',
        weight: 1.5,
        dashArray: '4 4',
        fillColor: '#2563eb',
        fillOpacity: 0.08,
        bubblingMouseEvents: true,
    },
};

function escapeHtml(text: string): string {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function buildAirspaceZoneTooltipHtml(
    zone: AirspaceZone,
    t: Translate,
    formatNumber: (value: number) => string,
): string {
    const typeLabel = escapeHtml(t(`airspace.zoneType.${zone.zoneType}`));
    const code = escapeHtml(zone.code);
    const name = escapeHtml(zone.name);
    const authority = escapeHtml(t('airspace.tooltip.authority', {authority: zone.authority}));
    const ceiling = escapeHtml(
        zone.maxAltitudeAglM != null
            ? t('airspace.tooltip.ceilingLimit', {meters: formatNumber(zone.maxAltitudeAglM)})
            : t('airspace.tooltip.ceilingUnlimited'),
    );
    return `<div style="font:500 12px/1.4 system-ui,sans-serif;min-width:180px">
        <div style="font-weight:700">${code} · ${name}</div>
        <div style="opacity:.85">${typeLabel}</div>
        <div style="opacity:.85">${authority}</div>
        <div style="opacity:.85">${ceiling}</div>
    </div>`;
}

export function renderAirspaceZonesLayer(
    L: typeof import('leaflet'),
    group: LayerGroup,
    zones: readonly AirspaceZone[],
    t: Translate,
    formatNumber: (value: number) => string,
): void {
    group.clearLayers();
    for (const zone of zones) {
        if (!zone.active) continue;
        const style = AIRSPACE_ZONE_MAP_STYLES[zone.zoneType] ?? AIRSPACE_ZONE_MAP_STYLES.WARNING;
        const tooltip = buildAirspaceZoneTooltipHtml(zone, t, formatNumber);
        if (zone.geometryType === 'CIRCLE') {
            const centerLat = Number(zone.centerLat);
            const centerLng = Number(zone.centerLng);
            const radius = Number(zone.radiusMeters);
            if (Number.isFinite(centerLat) && Number.isFinite(centerLng) && Number.isFinite(radius) && radius > 0) {
                L.circle([centerLat, centerLng], {
                    ...style,
                    radius,
                })
                    .bindTooltip(tooltip, {sticky: true})
                    .addTo(group);
            }
        } else if (zone.geometryType === 'POLYGON' && zone.vertices && zone.vertices.length >= 3) {
            const latLngs: [number, number][] = zone.vertices
                .filter(v => Array.isArray(v) && v.length >= 2)
                .map((v): [number, number] => [Number(v[0]), Number(v[1])])
                .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
            if (latLngs.length >= 3) {
                L.polygon(latLngs, style)
                    .bindTooltip(tooltip, {sticky: true})
                    .addTo(group);
            }
        }
    }
}
