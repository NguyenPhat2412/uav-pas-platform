'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect, useRef} from 'react';
import type {LayerGroup, Map as LeafletMap} from 'leaflet';
import type {FleetStation, FleetUav} from '@/features/uavs/types/fleet-map.types';

// Default view: Hanoi, where the VJU stations operate.
const FALLBACK: [number, number] = [21.0285, 105.8048];

export const uavStatusColor: Record<string, string> = {
    AVAILABLE: '#16a34a', ASSIGNED: '#6250d6', IN_USE: '#2a78d6', MAINTENANCE: '#d97706', INACTIVE: '#94a3b8',
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
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap | null>(null);
    const layer = useRef<LayerGroup | null>(null);
    const fitted = useRef(false);
    const select = useRef(onSelect);
    useEffect(() => {
        select.current = onSelect;
    }, [onSelect]);

    useEffect(() => {
        let cancelled = false;
        void import('leaflet').then(L => {
            if (cancelled || !container.current) return;
            if (!map.current) {
                map.current = L.map(container.current, {scrollWheelZoom: true}).setView(FALLBACK, 11);
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, attribution: '&copy; OpenStreetMap'}).addTo(map.current);
                layer.current = L.layerGroup().addTo(map.current);
            }
            layer.current!.clearLayers();
            const points: [number, number][] = [];
            for (const s of stations) {
                if (s.latitude == null || s.longitude == null) continue;
                points.push([s.latitude, s.longitude]);
                L.marker([s.latitude, s.longitude], {
                    icon: L.divIcon({className: '', iconSize: [16, 16], iconAnchor: [8, 8],
                        html: '<span style="display:block;width:16px;height:16px;background:#fff;border:3px solid #ab2523;box-shadow:0 1px 3px rgb(0 0 0/.3)"></span>'}),
                    keyboard: false, zIndexOffset: -100,
                }).bindTooltip(labels.station(s)).addTo(layer.current!);
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
                }).bindTooltip(labels.uav(u)).on('click', () => select.current(u.id)).addTo(layer.current!);
            }
            if (!fitted.current && points.length) {
                fitted.current = true;
                map.current!.fitBounds(L.latLngBounds(points).pad(0.3), {maxZoom: 13});
            }
            const target = uavs.find(u => u.id === selectedId);
            if (target?.latitude != null && target.longitude != null) {
                map.current!.flyTo([target.latitude, target.longitude], Math.max(map.current!.getZoom(), 13), {duration: 0.6});
            }
        });
        return () => {
            cancelled = true;
        };
    }, [uavs, stations, selectedId, labels]);

    useEffect(() => () => {
        map.current?.remove();
        map.current = null;
    }, []);

    return <div ref={container} className="h-full min-h-[420px] w-full" role="region" aria-label={labels.aria}/>;
}
