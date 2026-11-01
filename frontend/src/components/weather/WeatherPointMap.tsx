'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import type {CircleMarker, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {MAP_BASEMAPS, useMapConfig} from '@/lib/map-config';

/** A place drawn on the map as a React node (e.g. a weather icon with its temperature). */
export interface WeatherMapPlace {
    key: string;
    lat: number;
    lng: number;
    label: string;
    node: ReactNode;
}

/**
 * Map for the weather page: every place shows its own node (sunny, rainy… at the chosen hour), the
 * picked point is a red dot, and a click on the map or on a place picks that point. The first view fits
 * all places so the sunny and rainy areas read at a glance.
 */
export function WeatherPointMap({point, places, onPick, className}: {
    point: { lat: number; lng: number };
    places: WeatherMapPlace[];
    onPick: (lat: number, lng: number, label?: string) => void;
    className?: string;
}) {
    const {basemap} = useMapConfig();
    const container = useRef<HTMLDivElement>(null);
    const leaflet = useRef<typeof import('leaflet') | null>(null);
    const map = useRef<LeafletMap | null>(null);
    const tiles = useRef<TileLayer | null>(null);
    const pin = useRef<CircleMarker | null>(null);
    const placeLayer = useRef<LayerGroup | null>(null);
    const fitted = useRef(false);
    const pick = useRef(onPick);
    const [ready, setReady] = useState(false);
    // Marker elements the place nodes are portalled into, by place key.
    const [slots, setSlots] = useState<Record<string, HTMLElement>>({});

    useEffect(() => {
        pick.current = onPick;
    }, [onPick]);

    useEffect(() => {
        let cancelled = false;
        let resize: ResizeObserver | undefined;
        void import('leaflet').then(L => {
            if (cancelled || !container.current || map.current) return;
            leaflet.current = L;
            const instance = L.map(container.current, {scrollWheelZoom: false}).setView([point.lat, point.lng], 6);
            instance.on('click', event => pick.current(event.latlng.lat, event.latlng.lng));
            placeLayer.current = L.layerGroup().addTo(instance);
            pin.current = L.circleMarker([point.lat, point.lng], {radius: 8, color: '#ffffff', weight: 3, fillColor: '#ab2523', fillOpacity: 1}).addTo(instance);
            map.current = instance;
            // The grid settles after the map is created; redraw tiles whenever the box changes size.
            resize = new ResizeObserver(() => instance.invalidateSize());
            resize.observe(container.current);
            setReady(true);
        });
        return () => {
            cancelled = true;
            resize?.disconnect();
            map.current?.remove();
            map.current = null;
        };
        // The map is created once; later point changes move the pin below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const L = leaflet.current;
        if (!ready || !L || !map.current) return;
        tiles.current?.remove();
        const b = MAP_BASEMAPS[basemap];
        tiles.current = L.tileLayer(b.url, {maxZoom: b.maxZoom, attribution: b.attribution}).addTo(map.current);
    }, [ready, basemap]);

    useEffect(() => {
        if (!ready || !map.current || !pin.current) return;
        pin.current.setLatLng([point.lat, point.lng]);
        if (!map.current.getBounds().pad(-0.1).contains([point.lat, point.lng])) map.current.panTo([point.lat, point.lng]);
    }, [ready, point.lat, point.lng]);

    // Markers depend only on where the places are; their content updates through the portals.
    const placeKey = places.map(place => `${place.key}@${place.lat},${place.lng}`).join('|');
    useEffect(() => {
        const L = leaflet.current;
        const instance = map.current;
        if (!ready || !L || !instance || !placeLayer.current) return;
        placeLayer.current.clearLayers();
        const next: Record<string, HTMLElement> = {};
        for (const place of places) {
            const marker = L.marker([place.lat, place.lng], {
                icon: L.divIcon({className: '', html: '', iconSize: [64, 56], iconAnchor: [32, 28]}),
                title: place.label,
                keyboard: true,
                riseOnHover: true,
            })
                .on('click', event => {
                    L.DomEvent.stopPropagation(event);
                    pick.current(place.lat, place.lng, place.label);
                })
                .addTo(placeLayer.current);
            const element = marker.getElement();
            if (element) next[place.key] = element;
        }
        setSlots(next);
        if (!fitted.current && places.length > 1) {
            fitted.current = true;
            instance.fitBounds(L.latLngBounds(places.map(place => [place.lat, place.lng] as [number, number])).pad(0.15));
        }
        // places is read through placeKey so content-only changes do not rebuild the markers.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, placeKey]);

    return <>
        <div ref={container} className={className}/>
        {places.map(place => slots[place.key] ? createPortal(place.node, slots[place.key], place.key) : null)}
    </>;
}
