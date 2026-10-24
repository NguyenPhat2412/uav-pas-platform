'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect, useRef, useState} from 'react';
import type {Map as LeafletMap, Marker} from 'leaflet';
import {Crosshair} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';

// Hoa Lac Hi-Tech Park (VJU campus) as the default view when no point is chosen yet.
const DEFAULT_CENTER: [number, number] = [21.0136, 105.5259];
const round = (value: number) => Math.round(value * 1e6) / 1e6;

export function LocationPicker({latitude, longitude, onChange}: {
    latitude?: number;
    longitude?: number;
    onChange: (latitude: number, longitude: number) => void;
}) {
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap | null>(null);
    const marker = useRef<Marker | null>(null);
    const place = useRef<(lat: number, lng: number) => void>(() => undefined);
    const change = useRef(onChange);
    const {t} = useI18n();
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<'' | 'unsupported' | 'failed'>('');
    const hasPoint = latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude);
    useEffect(() => {
        change.current = onChange;
    }, [onChange]);

    useEffect(() => {
        let disposed = false;
        void import('leaflet').then(L => {
            if (disposed || !container.current || map.current) return;
            const instance = L.map(container.current, {scrollWheelZoom: false})
                .setView(hasPoint ? [latitude, longitude] : DEFAULT_CENTER, hasPoint ? 15 : 12);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap'
            }).addTo(instance);
            const icon = L.divIcon({
                className: 'rounded-full border-[3px] border-card bg-primary shadow-md ring-2 ring-primary cursor-grab',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });
            place.current = (lat, lng) => {
                if (marker.current) marker.current.setLatLng([lat, lng]);
                else {
                    marker.current = L.marker([lat, lng], {icon, draggable: true, keyboard: false}).addTo(instance);
                    marker.current.on('dragend', () => {
                        const point = marker.current!.getLatLng();
                        change.current(round(point.lat), round(point.lng));
                    });
                }
            };
            if (hasPoint) place.current(latitude, longitude);
            instance.on('click', event => change.current(round(event.latlng.lat), round(event.latlng.lng)));
            map.current = instance;
        });
        return () => {
            disposed = true;
            map.current?.remove();
            map.current = null;
            marker.current = null;
        };
        // The map is created once; later coordinate changes are synced by the effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasPoint || !map.current) return;
        place.current(latitude, longitude);
        if (!map.current.getBounds().contains([latitude, longitude])) map.current.panTo([latitude, longitude]);
    }, [hasPoint, latitude, longitude]);

    const locate = () => {
        if (!navigator.geolocation) {
            setLocateError('unsupported');
            return;
        }
        setLocating(true);
        setLocateError('');
        navigator.geolocation.getCurrentPosition(position => {
            setLocating(false);
            change.current(round(position.coords.latitude), round(position.coords.longitude));
            map.current?.setView([position.coords.latitude, position.coords.longitude], 16);
        }, () => {
            setLocating(false);
            setLocateError('failed');
        }, {timeout: 10_000});
    };

    return <div className="col-span-full grid gap-2">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-foreground">
            <span>{t('map.label')}</span>
            <button type="button" className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline disabled:opacity-55" onClick={locate} disabled={locating}>
                <Crosshair size={14} aria-hidden="true"/>{locating ? t('map.locating') : t('map.useMyLocation')}
            </button>
        </div>
        <div ref={container} className="z-0 h-60 w-full rounded-lg border border-border-input sm:h-75" role="application"
             aria-label={t('map.ariaLabel')}/>
        <p className="m-0 text-sm text-muted">{hasPoint
            ? t('map.selected', {lat: latitude, lng: longitude})
            : t('map.hint')}</p>
        {locateError && <p className="m-0 text-sm leading-normal text-danger" role="alert">{t(locateError === 'unsupported' ? 'map.unsupported' : 'map.locateFailed')}</p>}
    </div>;
}
