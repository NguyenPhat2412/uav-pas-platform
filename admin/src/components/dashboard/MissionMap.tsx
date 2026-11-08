'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect, useRef, useState} from 'react';
import type {Control, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {MapLayerToolbar} from '@/components/shared/MapLayerToolbar';
import type {MapPoint} from '@/types/dashboard/dashboard.types';
import {MAP_BASEMAPS, syncScaleControl, useMapConfig} from '@/lib/map-config';

export type {MapPoint};

export function MissionMap({
    points,
    ariaLabel,
    selectedCode,
    onSelect,
}: {
    points: MapPoint[];
    ariaLabel: string;
    selectedCode?: string | null;
    onSelect?: (code: string) => void;
}) {
    const {config, basemap, setBasemap} = useMapConfig();
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap | null>(null);
    const tiles = useRef<TileLayer | null>(null);
    const layer = useRef<LayerGroup | null>(null);
    const scaleControl = useRef<Control.Scale | null>(null);
    const leaflet = useRef<typeof import('leaflet') | null>(null);
    const [ready, setReady] = useState(false);
    const selectRef = useRef(onSelect);
    useEffect(() => {
        selectRef.current = onSelect;
    }, [onSelect]);

    useEffect(() => {
        let cancelled = false;
        let resizeObserver: ResizeObserver | null = null;
        void import('leaflet').then(L => {
            if (cancelled || !container.current || map.current) return;
            leaflet.current = L;
            map.current = L.map(container.current, {scrollWheelZoom: false, attributionControl: true}).setView(config.defaultCenter, config.defaultZoom);
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
        for (const point of points) {
            const isSelected = selectedCode != null && point.code === selectedCode;
            const size = isSelected ? 22 : 16;
            const pulseRing = point.pulse || isSelected
                ? `<span style="position:absolute;inset:-6px;border-radius:9999px;border:2px solid #dc2626;background:rgba(220,38,38,0.18);animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>`
                : '';
            const marker = L.marker([point.latitude, point.longitude], {
                icon: L.divIcon({
                    className: '',
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size / 2],
                    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px;cursor:pointer;">${pulseRing}<span style="position:relative;display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${point.color};border:3px solid #ffffff;box-shadow:0 0 0 ${isSelected ? 3 : 1.5}px #b91c1c, 0 2px 6px rgba(185,28,28,0.35);"></span></span>`,
                }),
                zIndexOffset: isSelected ? 1000 : point.pulse ? 500 : 0,
                title: `${point.code} · ${point.label}`,
            }).bindTooltip(`<strong>${point.code}</strong> · ${point.label}`);
            marker.on('click', () => selectRef.current?.(point.code));
            marker.addTo(layer.current);
        }
        if (points.length && !selectedCode) {
            const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]));
            map.current.fitBounds(bounds.pad(0.3), {maxZoom: 13});
        }
    }, [ready, points, selectedCode]);

    useEffect(() => {
        const L = leaflet.current;
        if (!ready || !L || !map.current || !selectedCode) return;
        const target = points.find(p => p.code === selectedCode);
        if (target) {
            map.current.flyTo([target.latitude, target.longitude], Math.max(map.current.getZoom(), 13), {duration: 0.5});
        }
    }, [ready, selectedCode, points]);

    const resetView = () => {
        const L = leaflet.current;
        if (!L || !map.current) return;
        if (points.length) {
            const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]));
            map.current.fitBounds(bounds.pad(0.3), {maxZoom: 13});
        } else {
            map.current.setView(config.defaultCenter, config.defaultZoom);
        }
    };

    return (
        <div className="relative isolate h-[380px] rounded-b-none border-t border-rose-200 bg-white">
            <MapLayerToolbar
                variant="overlay"
                basemap={basemap}
                onBasemapChange={setBasemap}
                onResetView={resetView}
            />
            <div ref={container} className="z-0 h-full w-full" role="img" aria-label={ariaLabel}/>
        </div>
    );
}
