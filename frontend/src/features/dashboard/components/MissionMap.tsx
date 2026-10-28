'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect, useRef, useState} from 'react';
import type {Control, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {MapLayerToolbar} from '@/components/shared/MapLayerToolbar';
import type {MapPoint} from '@/features/dashboard/types/dashboard.types';
import {MAP_BASEMAPS, syncScaleControl, useMapConfig} from '@/lib/map-config';

export type {MapPoint};

export function MissionMap({points, ariaLabel}: { points: MapPoint[]; ariaLabel: string }) {
    const {config, basemap, setBasemap} = useMapConfig();
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap | null>(null);
    const tiles = useRef<TileLayer | null>(null);
    const layer = useRef<LayerGroup | null>(null);
    const scaleControl = useRef<Control.Scale | null>(null);
    const leaflet = useRef<typeof import('leaflet') | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void import('leaflet').then(L => {
            if (cancelled || !container.current || map.current) return;
            leaflet.current = L;
            map.current = L.map(container.current, {scrollWheelZoom: false, attributionControl: true}).setView(config.defaultCenter, config.defaultZoom);
            layer.current = L.layerGroup().addTo(map.current);
            setReady(true);
        });
        return () => {
            cancelled = true;
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
            L.circleMarker([point.latitude, point.longitude], {
                radius: 7, color: 'var(--card)', weight: 2, fillColor: point.color, fillOpacity: 0.9
            }).bindTooltip(`${point.code} · ${point.label}`).addTo(layer.current);
        }
        if (points.length) {
            const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]));
            map.current.fitBounds(bounds.pad(0.3), {maxZoom: 13});
        }
    }, [ready, points]);

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
        <div className="relative isolate h-[340px] rounded-b-none border-t border-border">
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
