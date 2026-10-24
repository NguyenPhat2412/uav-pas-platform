'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect, useRef} from 'react';
import type {LayerGroup, Map as LeafletMap} from 'leaflet';

export type MapPoint = { code: string; latitude: number; longitude: number; color: string; label: string };

// Default view: Hanoi, where the VJU stations operate.
const FALLBACK: [number, number] = [21.0285, 105.8048];

export function MissionMap({points, ariaLabel}: { points: MapPoint[]; ariaLabel: string }) {
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap | null>(null);
    const layer = useRef<LayerGroup | null>(null);

    useEffect(() => {
        let cancelled = false;
        void import('leaflet').then(L => {
            if (cancelled || !container.current) return;
            if (!map.current) {
                map.current = L.map(container.current, {scrollWheelZoom: false, attributionControl: true}).setView(FALLBACK, 11);
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '&copy; OpenStreetMap'
                }).addTo(map.current);
                layer.current = L.layerGroup().addTo(map.current);
            }
            layer.current?.clearLayers();
            for (const point of points) {
                L.circleMarker([point.latitude, point.longitude], {
                    radius: 7, color: '#fff', weight: 2, fillColor: point.color, fillOpacity: 0.9
                }).bindTooltip(`${point.code} · ${point.label}`).addTo(layer.current!);
            }
            if (points.length) {
                const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]));
                map.current.fitBounds(bounds.pad(0.3), {maxZoom: 13});
            }
        });
        return () => {
            cancelled = true;
        };
    }, [points]);

    useEffect(() => () => {
        map.current?.remove();
        map.current = null;
    }, []);

    return <div ref={container} className="mission-map" role="img" aria-label={ariaLabel}/>;
}
