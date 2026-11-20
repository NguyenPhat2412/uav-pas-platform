'use client';

import 'leaflet/dist/leaflet.css';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {MAP_BASEMAPS, useMapConfig} from '@/lib/map-config';
import type {OrderTrackingPosition} from '@/types/project/project.types';

function toLatLngList(raw?: readonly (readonly [number, number])[] | null): [number, number][] {
    if (!Array.isArray(raw)) return [];
    const out: [number, number][] = [];
    for (const pair of raw) {
        if (Array.isArray(pair) && pair.length >= 2) {
            const lat = Number(pair[0]);
            const lng = Number(pair[1]);
            if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                out.push([lat, lng]);
            }
        }
    }
    return out;
}

export function OrderTrackingPathMap({
    waypoints,
    track,
    position,
    fallbackCenter,
    ariaLabel,
    plannedLabel,
    flownLabel,
    uavLabel,
}: {
    waypoints?: [number, number][] | null;
    track?: [number, number][] | null;
    position?: OrderTrackingPosition | null;
    fallbackCenter?: [number, number] | null;
    ariaLabel: string;
    plannedLabel: string;
    flownLabel: string;
    uavLabel: string;
}) {
    const {config, basemap} = useMapConfig();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const tilesRef = useRef<TileLayer | null>(null);
    const layerRef = useRef<LayerGroup | null>(null);
    const leafletRef = useRef<typeof import('leaflet') | null>(null);
    const fittedSignatureRef = useRef<string>('');
    const [ready, setReady] = useState(false);

    const plannedPoints = useMemo(() => toLatLngList(waypoints), [waypoints]);
    const flownPoints = useMemo(() => toLatLngList(track), [track]);
    const uavPoint = useMemo<[number, number] | null>(() => {
        if (!position) return null;
        const lat = Number(position.latitude);
        const lng = Number(position.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
    }, [position]);

    useEffect(() => {
        let cancelled = false;
        let observer: ResizeObserver | null = null;
        void import('leaflet').then(L => {
            if (cancelled || !containerRef.current || mapRef.current) return;
            leafletRef.current = L;
            const initialCenter = uavPoint ?? plannedPoints[0] ?? flownPoints[0] ?? fallbackCenter ?? config.defaultCenter;
            mapRef.current = L.map(containerRef.current, {
                scrollWheelZoom: false,
                attributionControl: true,
            }).setView(initialCenter, 14);
            layerRef.current = L.layerGroup().addTo(mapRef.current);
            setReady(true);
            if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
                observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
                observer.observe(containerRef.current);
            }
            window.setTimeout(() => mapRef.current?.invalidateSize(), 120);
        });
        return () => {
            cancelled = true;
            observer?.disconnect();
            tilesRef.current = null;
            layerRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const L = leafletRef.current;
        if (!ready || !L || !mapRef.current) return;
        tilesRef.current?.remove();
        const spec = MAP_BASEMAPS[basemap];
        tilesRef.current = L.tileLayer(spec.url, {maxZoom: spec.maxZoom, attribution: spec.attribution}).addTo(mapRef.current);
    }, [ready, basemap]);

    useEffect(() => {
        const L = leafletRef.current;
        if (!ready || !L || !mapRef.current || !layerRef.current) return;
        layerRef.current.clearLayers();

        const boundsPoints: [number, number][] = [];

        if (plannedPoints.length >= 2) {
            L.polyline(plannedPoints, {
                color: '#64748b',
                weight: 2.5,
                dashArray: '6 6',
                opacity: 0.85,
            }).addTo(layerRef.current);
            boundsPoints.push(...plannedPoints);
        }

        if (flownPoints.length >= 2) {
            L.polyline(flownPoints, {
                color: '#ab2523',
                weight: 3.5,
                opacity: 0.95,
            }).addTo(layerRef.current);
            boundsPoints.push(...flownPoints);
        }

        if (uavPoint) {
            const heading = Number.isFinite(Number(position?.headingDeg)) ? Number(position?.headingDeg) : 0;
            const marker = L.marker(uavPoint, {
                icon: L.divIcon({
                    className: '',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                    html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:#ab2523;border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(15,23,42,0.35);transform:rotate(${heading}deg);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg></div>`,
                }),
                zIndexOffset: 1000,
                title: uavLabel,
            });
            marker.addTo(layerRef.current);
            boundsPoints.push(uavPoint);
        } else if (boundsPoints.length === 0 && fallbackCenter) {
            L.circleMarker(fallbackCenter, {
                radius: 7,
                color: '#ffffff',
                weight: 2,
                fillColor: '#ab2523',
                fillOpacity: 1,
            }).addTo(layerRef.current);
            boundsPoints.push(fallbackCenter);
        }

        const sig = `${plannedPoints.length}:${flownPoints.length > 0 ? 1 : 0}:${fallbackCenter ? fallbackCenter.join(',') : ''}`;
        if (boundsPoints.length >= 2 && fittedSignatureRef.current !== sig) {
            fittedSignatureRef.current = sig;
            const bounds = L.latLngBounds(boundsPoints);
            mapRef.current.fitBounds(bounds.pad(0.22), {maxZoom: 16});
        } else if (boundsPoints.length === 1 && fittedSignatureRef.current !== sig) {
            fittedSignatureRef.current = sig;
            mapRef.current.setView(boundsPoints[0], 15);
        }
    }, [ready, plannedPoints, flownPoints, uavPoint, position?.headingDeg, fallbackCenter, uavLabel]);

    return (
        <div className="overflow-hidden rounded-control border border-slate-200 bg-slate-50">
            <div
                ref={containerRef}
                role="region"
                aria-label={ariaLabel}
                className="h-52 w-full sm:h-60"
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-0 w-4 border-t-2 border-dashed border-slate-500" aria-hidden="true"/>
                    {plannedLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 rounded bg-primary" aria-hidden="true"/>
                    {flownLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-uav-red-light" aria-hidden="true"/>
                    {uavLabel}
                </span>
            </div>
        </div>
    );
}
