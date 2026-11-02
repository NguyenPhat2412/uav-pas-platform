'use client';

import 'leaflet/dist/leaflet.css';
import React, {useEffect, useRef, useState} from 'react';
import type {Control, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {MapLayerToolbar} from '@/components/shared/MapLayerToolbar';
import {MAP_BASEMAPS, syncScaleControl, useMapConfig} from '@/lib/map-config';
import type {LatLng, SimulationState} from '@/types/simulation/simulation.types';

// Leaflet styles vectors through options, so the theme colours are spelled out here.
const C = {red: '#c43a4a', slate: '#334155', blue: '#475569', amber: '#d97706', muted: '#94a3b8'};
const pin = (bg: string, text: string, size = 22) =>
    `<span style="display:flex;width:${size}px;height:${size}px;align-items:center;justify-content:center;background:${bg};color:#fff;font:700 10px system-ui;border:2px solid #fff;border-radius:999px;box-shadow:0 1px 4px rgb(0 0 0/.4)">${text}</span>`;
const aircraft = (heading: number) =>
    `<span style="display:block;width:30px;height:30px;transform:rotate(${heading}deg)"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 2 19 21 12 17 5 21Z" fill="${C.red}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></span>`;

export type DrawMode = 'none' | 'waypoints' | 'area';

/**
 * Map of one simulated flight: planned route (dashed), flown track (solid), home, geofence and the
 * aircraft itself. While drawing, a click adds a waypoint or an area vertex through `onPick`.
 */
export function SimulationMap({state, draftRoute, draftArea, drawMode, onPick}: {
    state: SimulationState | null;
    draftRoute: LatLng[];
    draftArea: LatLng[];
    drawMode: DrawMode;
    onPick: (point: LatLng) => void;
}) {
    const {config, basemap, setBasemap} = useMapConfig();
    const container = useRef<HTMLDivElement | null>(null);
    const map = useRef<LeafletMap | null>(null);
    const tiles = useRef<TileLayer | null>(null);
    const plan = useRef<LayerGroup | null>(null);
    const live = useRef<LayerGroup | null>(null);
    const scaleControl = useRef<Control.Scale | null>(null);
    const leaflet = useRef<typeof import('leaflet') | null>(null);
    const onPickRef = useRef(onPick);
    const drawRef = useRef(drawMode);
    const fittedFor = useRef<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        onPickRef.current = onPick;
        drawRef.current = drawMode;
    }, [onPick, drawMode]);

    useEffect(() => {
        let disposed = false;
        let resizeObserver: ResizeObserver | null = null;
        void import('leaflet').then(L => {
            if (disposed || !container.current || map.current) return;
            leaflet.current = L;
            map.current = L.map(container.current, {scrollWheelZoom: true}).setView(config.defaultCenter, 15);
            plan.current = L.layerGroup().addTo(map.current);
            live.current = L.layerGroup().addTo(map.current);
            map.current.on('click', e => {
                if (drawRef.current !== 'none') onPickRef.current([
                    Math.round(e.latlng.lat * 1e7) / 1e7, Math.round(e.latlng.lng * 1e7) / 1e7]);
            });
            setReady(true);
            if (typeof ResizeObserver !== 'undefined' && container.current) {
                resizeObserver = new ResizeObserver(() => map.current?.invalidateSize());
                resizeObserver.observe(container.current);
            }
            setTimeout(() => map.current?.invalidateSize(), 150);
        });
        return () => {
            disposed = true;
            resizeObserver?.disconnect();
            scaleControl.current = null;
            map.current?.remove();
            map.current = null;
            tiles.current = null;
        };
        // One map for the console's lifetime; the default centre only matters at creation.
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

    // Planned geometry: drafts before a flight, the flight's own route and home once it runs.
    useEffect(() => {
        const L = leaflet.current;
        const group = plan.current;
        if (!ready || !L || !group || !map.current) return;
        group.clearLayers();
        if (draftArea.length) {
            L.polygon(draftArea, {color: C.blue, weight: 2, fillColor: C.blue, fillOpacity: 0.08, dashArray: '6 4'}).addTo(group);
            draftArea.forEach(p => L.circleMarker(p, {radius: 4, color: '#fff', weight: 2, fillColor: C.blue, fillOpacity: 1}).addTo(group));
        }
        const route = state?.waypoints.length ? state.waypoints : draftRoute;
        if (route.length) {
            L.polyline(route, {color: C.slate, weight: 2, opacity: 0.8, dashArray: '5 5'}).addTo(group);
            route.forEach((p, i) => {
                const done = state ? i < state.nextWaypoint : false;
                L.circleMarker(p, {radius: 3.5, color: '#fff', weight: 1.5, fillColor: done ? C.muted : C.slate, fillOpacity: 1})
                    .bindTooltip(String(i + 1)).addTo(group);
            });
        }
        if (state) {
            L.marker(state.home, {icon: L.divIcon({className: '', iconSize: [22, 22], iconAnchor: [11, 11], html: pin(C.slate, 'H')}), keyboard: false}).addTo(group);
            L.circle(state.home, {radius: state.settings.geofenceRadiusMeters, color: C.amber, weight: 1, fill: false, dashArray: '2 6'}).addTo(group);
        }
        // Fit once per flight (or to the drafts), never while the operator is panning around.
        const key = state ? `flight-${state.uavId}-${state.startedAt}` : `draft-${draftRoute.length + draftArea.length > 0}`;
        if (fittedFor.current !== key) {
            const points: LatLng[] = state ? [state.home, ...state.waypoints] : [...draftRoute, ...draftArea];
            if (points.length > 1) map.current.fitBounds(L.latLngBounds(points), {padding: [30, 30], maxZoom: 17});
            else if (points.length === 1) map.current.setView(points[0], 16);
            if (points.length) fittedFor.current = key;
        }
    }, [ready, state, draftRoute, draftArea]);

    // Live layer: the flown track and the aircraft, redrawn on every poll.
    useEffect(() => {
        const L = leaflet.current;
        const group = live.current;
        if (!ready || !L || !group) return;
        group.clearLayers();
        if (!state) return;
        if (state.track.length > 1) L.polyline(state.track, {color: C.red, weight: 3, opacity: 0.9}).addTo(group);
        L.marker([state.latitude, state.longitude], {
            icon: L.divIcon({className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: aircraft(state.headingDeg)}),
            keyboard: false,
            zIndexOffset: 1000,
        }).addTo(group);
    }, [ready, state]);

    return <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-panel border border-border bg-card">
        <div className="flex justify-end border-b border-border px-3 py-2">
            <MapLayerToolbar
                variant="inline"
                basemap={basemap}
                onBasemapChange={setBasemap}
                onResetView={() => map.current?.setView(state ? state.home : config.defaultCenter, 15)}
            />
        </div>
        <div ref={container} className={drawMode === 'none' ? 'relative z-0 flex-1' : 'relative z-0 flex-1 cursor-crosshair'}/>
    </div>;
}
