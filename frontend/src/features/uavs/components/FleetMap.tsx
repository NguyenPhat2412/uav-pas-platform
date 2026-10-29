'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect, useRef, useState} from 'react';
import type {Control, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {MapLayerToolbar} from '@/components/shared/MapLayerToolbar';
import type {FleetStation, FleetUav} from '@/features/uavs/types/fleet-map.types';
import {MAP_BASEMAPS, syncScaleControl, useMapConfig} from '@/lib/map-config';

export const uavStatusColor: Record<string, string> = {
    AVAILABLE: '#3f3f46', ASSIGNED: '#71717a', IN_USE: '#c43a4a', MAINTENANCE: '#a1a1aa', INACTIVE: '#d4d4d8',
};

/**
 * UAVs as status-coloured dots, stations as squares. UAVs sharing a station are fanned out slightly so each
 * stays clickable. Selecting a UAV (from the list or the map) flies the map to it.
 */
export function FleetMap({uavs, stations, selectedId, onSelect, labels}: {
    uavs: FleetUav[];
    stations: FleetStation[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    labels: { aria: string; uav: (u: FleetUav) => string; station: (s: FleetStation) => string };
}) {
    const {config, basemap, setBasemap, showStationRadius, setShowStationRadius} = useMapConfig();
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap | null>(null);
    const tiles = useRef<TileLayer | null>(null);
    const layer = useRef<LayerGroup | null>(null);
    const scaleControl = useRef<Control.Scale | null>(null);
    const leaflet = useRef<typeof import('leaflet') | null>(null);
    const [ready, setReady] = useState(false);
    const fitted = useRef(false);
    const select = useRef(onSelect);
    useEffect(() => {
        select.current = onSelect;
    }, [onSelect]);

    useEffect(() => {
        let cancelled = false;
        let resizeObserver: ResizeObserver | null = null;
        void import('leaflet').then(L => {
            if (cancelled || !container.current || map.current) return;
            leaflet.current = L;
            map.current = L.map(container.current, {scrollWheelZoom: true}).setView(config.defaultCenter, config.defaultZoom);
            layer.current = L.layerGroup().addTo(map.current);
            setReady(true);

            if (typeof ResizeObserver !== 'undefined' && container.current) {
                resizeObserver = new ResizeObserver(() => {
                    map.current?.invalidateSize();
                });
                resizeObserver.observe(container.current);
            }
            setTimeout(() => map.current?.invalidateSize(), 100);
            setTimeout(() => map.current?.invalidateSize(), 350);
        });
        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
            scaleControl.current = null;
            tiles.current = null;
            map.current?.remove();
            map.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const L = leaflet.current;
        if (!ready || !L || !map.current) return;
        tiles.current?.remove();
        const spec = MAP_BASEMAPS[basemap];
        tiles.current = L.tileLayer(spec.url, {maxZoom: spec.maxZoom, attribution: spec.attribution}).addTo(map.current);
    }, [ready, basemap]);

    useEffect(() => {
        const L = leaflet.current;
        if (!ready || !L || !map.current) return;
        syncScaleControl(L, map.current, scaleControl, config.showScaleBar);
    }, [ready, config.showScaleBar]);

    useEffect(() => {
        const L = leaflet.current;
        if (!ready || !L || !map.current || !layer.current) return;
        layer.current.clearLayers();
        const points: [number, number][] = [];
        for (const s of stations) {
            if (s.latitude == null || s.longitude == null) continue;
            points.push([s.latitude, s.longitude]);
            if (showStationRadius && config.stationCoverageRadiusMeters > 0) {
                L.circle([s.latitude, s.longitude], {
                    radius: config.stationCoverageRadiusMeters,
                    color: '#71717a',
                    weight: 1.5,
                    dashArray: '6 4',
                    fillColor: '#71717a',
                    fillOpacity: 0.06,
                    interactive: false,
                }).addTo(layer.current);
            }
            L.marker([s.latitude, s.longitude], {
                icon: L.divIcon({className: '', iconSize: [16, 16], iconAnchor: [8, 8],
                    html: '<span style="display:block;width:16px;height:16px;background:#fff;border:3px solid #c43a4a;box-shadow:0 1px 3px rgb(0 0 0/.3)"></span>'}),
                keyboard: false, zIndexOffset: -100,
            }).bindTooltip(labels.station(s)).addTo(layer.current);
        }
        const seen = new Map<string, number>();
        for (const u of uavs) {
            if (u.latitude == null || u.longitude == null) continue;
            const key = `${u.latitude.toFixed(5)},${u.longitude.toFixed(5)}`;
            const n = seen.get(key) ?? 0;
            seen.set(key, n + 1);
            const angle = n * 2.4, offset = n ? 0.0004 * Math.sqrt(n) : 0;
            const position: [number, number] = [u.latitude + offset * Math.sin(angle), u.longitude + offset * Math.cos(angle)];
            points.push(position);
            const selected = u.id === selectedId, size = selected ? 22 : 16;
            L.marker(position, {
                icon: L.divIcon({className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
                    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${uavStatusColor[u.status] ?? '#94a3b8'};border:3px solid #fff;box-shadow:0 0 0 ${selected ? 3 : 1}px ${selected ? '#0f172a' : 'rgb(0 0 0/.25)'}"></span>`}),
                zIndexOffset: selected ? 1000 : 0, title: labels.uav(u), alt: labels.uav(u),
            }).bindTooltip(labels.uav(u)).on('click', () => select.current(u.id)).addTo(layer.current);
        }
        if (!fitted.current && points.length) {
            fitted.current = true;
            map.current.fitBounds(L.latLngBounds(points).pad(0.3), {maxZoom: 13});
        }
        const target = uavs.find(u => u.id === selectedId);
        if (target?.latitude != null && target.longitude != null) {
            map.current.flyTo([target.latitude, target.longitude], Math.max(map.current.getZoom(), 13), {duration: 0.6});
        }
    }, [ready, uavs, stations, selectedId, labels, showStationRadius, config.stationCoverageRadiusMeters]);

    const resetView = () => {
        const L = leaflet.current;
        if (!L || !map.current) return;
        const points: [number, number][] = [];
        stations.forEach(s => {
            if (s.latitude != null && s.longitude != null) points.push([s.latitude, s.longitude]);
        });
        uavs.forEach(u => {
            if (u.latitude != null && u.longitude != null) points.push([u.latitude, u.longitude]);
        });
        if (points.length) {
            map.current.fitBounds(L.latLngBounds(points).pad(0.3), {maxZoom: 13});
        } else {
            map.current.setView(config.defaultCenter, config.defaultZoom);
        }
    };

    return (
        <div className="relative h-full min-h-[420px] w-full">
            <MapLayerToolbar
                variant="overlay"
                basemap={basemap}
                onBasemapChange={setBasemap}
                showStationRadius={showStationRadius}
                onToggleStationRadius={() => setShowStationRadius(!showStationRadius)}
                onResetView={resetView}
            />
            <div ref={container} className="h-full min-h-[420px] w-full" role="region" aria-label={labels.aria}/>
        </div>
    );
}
