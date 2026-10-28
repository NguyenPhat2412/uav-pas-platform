'use client';

import 'leaflet/dist/leaflet.css';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import type {Control, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {Route, ShieldAlert, ShieldCheck} from 'lucide-react';
import {MapLayerToolbar} from '@/components/shared/MapLayerToolbar';
import {parseSearchArea, sarService} from '@/lib/api/services';
import {isPersonLabel} from '@/features/sar/components/AiViewfinder';
import {calculateHaversineDistance, isPointInsideGeofence} from '@/features/sar/utils/sarAlgorithms';
import type {SarFlightPlan, SarTacticalMapProps} from '@/features/sar/types/sar.types';
import {useI18n} from '@/contexts/I18nContext';
import {toast} from '@/contexts/ToastContext';
import {MAP_BASEMAPS, syncScaleControl, useMapConfig} from '@/lib/map-config';
import {cn} from '@/lib/utils';

// Leaflet styles vectors through options, so the theme colours are spelled out here.
const C = {red: '#ab2523', blue: '#004ac6', amber: '#d97706', slate: '#334155', muted: '#94a3b8'};
const pin = (bg: string, text: string, size = 24) =>
    `<span style="display:flex;width:${size}px;height:${size}px;align-items:center;justify-content:center;background:${bg};color:#fff;font:700 11px system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgb(0 0 0/.4)">${text}</span>`;

export function SarTacticalMap({mission, detections, telemetry, selectedId, onSelect}: SarTacticalMapProps) {
    const {t, formatNumber} = useI18n();
    const {config, basemap, setBasemap} = useMapConfig();
    const container = useRef<HTMLDivElement | null>(null);
    const map = useRef<LeafletMap | null>(null);
    const tiles = useRef<TileLayer | null>(null);
    const overlay = useRef<LayerGroup | null>(null);
    const uavLayer = useRef<LayerGroup | null>(null);
    const scaleControl = useRef<Control.Scale | null>(null);
    const leaflet = useRef<typeof import('leaflet') | null>(null);
    const onSelectRef = useRef(onSelect);
    const [ready, setReady] = useState(false);
    const [plan, setPlan] = useState<SarFlightPlan | null>(null);

    useEffect(() => {
        onSelectRef.current = onSelect;
    }, [onSelect]);

    const area = useMemo(() => parseSearchArea(mission.searchAreaPolygon), [mission.searchAreaPolygon]);
    const lkp: [number, number] = [mission.lkpLatitude, mission.lkpLongitude];
    const home = mission.stationLatitude != null && mission.stationLongitude != null
        ? {lat: mission.stationLatitude, lng: mission.stationLongitude} : null;
    const uav = telemetry && !telemetry.stale ? {lat: telemetry.latitude, lng: telemetry.longitude} : null;
    const insideArea = uav && area.length ? isPointInsideGeofence(uav, area.map(([lat, lng]) => ({lat, lng}))) : null;
    const toHome = uav && home ? calculateHaversineDistance(uav, home) : null;

    const generate = useMutation({
        mutationFn: () => sarService.flightPlan(mission.missionId, mission.lkpLatitude, mission.lkpLongitude),
        onSuccess: p => {
            setPlan(p);
            toast.success(t('opsShared.sar.map.planReady', {legs: p.waypoints.length - 1, minutes: p.estimatedFlightMinutes}));
        },
        onError: e => toast.error(e instanceof Error ? e.message : t('opsShared.sar.map.planFailed')),
    });

    useEffect(() => {
        let disposed = false;
        void import('leaflet').then(L => {
            if (disposed || !container.current || map.current) return;
            leaflet.current = L;
            map.current = L.map(container.current, {scrollWheelZoom: false}).setView(lkp, 15);
            overlay.current = L.layerGroup().addTo(map.current);
            uavLayer.current = L.layerGroup().addTo(map.current);
            setReady(true);
        });
        return () => {
            disposed = true;
            scaleControl.current = null;
            map.current?.remove();
            map.current = null;
            tiles.current = null;
        };
        // One map per mission (the cockpit remounts this component when the mission changes).
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
        const group = overlay.current;
        if (!ready || !L || !group || !map.current) return;
        group.clearLayers();
        const bounds = L.latLngBounds([lkp]);
        if (area.length) {
            L.polygon(area, {color: C.blue, weight: 2, fillColor: C.blue, fillOpacity: 0.08, dashArray: '6 4'})
                .bindTooltip(t('opsShared.sar.map.searchArea')).addTo(group);
            area.forEach(p => bounds.extend(p));
        }
        if (mission.driftRadiusMeters) {
            const drift = L.circle(lkp, {radius: mission.driftRadiusMeters, color: C.red, weight: 1.5, fillColor: C.red, fillOpacity: 0.1})
                .bindTooltip(t('opsShared.sar.map.driftRadius', {meters: formatNumber(mission.driftRadiusMeters)})).addTo(group);
            bounds.extend(drift.getBounds());
        }
        L.marker(lkp, {icon: L.divIcon({className: '', iconSize: [26, 26], iconAnchor: [13, 13], html: pin(C.red, 'LKP', 30)}), keyboard: false})
            .bindTooltip(t('opsShared.sar.map.lkp')).addTo(group);
        if (home) {
            L.marker([home.lat, home.lng], {icon: L.divIcon({className: '', iconSize: [24, 24], iconAnchor: [12, 12], html: pin(C.slate, 'H')}), keyboard: false})
                .bindTooltip(mission.stationName ?? t('opsShared.sar.map.home')).addTo(group);
            bounds.extend([home.lat, home.lng]);
        }
        if (plan) {
            L.polyline(plan.waypoints.map(w => [w.lat, w.lng] as [number, number]), {color: C.blue, weight: 2.5, opacity: 0.85}).addTo(group);
            plan.waypoints.forEach(w => bounds.extend([w.lat, w.lng]));
        }
        detections.filter(d => d.latitude != null && d.longitude != null).forEach(d => {
            const color = d.verified ? C.blue : isPersonLabel(d.label) ? C.red : C.amber;
            const active = d.id === selectedId;
            L.circleMarker([d.latitude!, d.longitude!], {radius: active ? 10 : 7, color: '#fff', weight: active ? 3 : 2, fillColor: color, fillOpacity: 1})
                .bindTooltip(`${d.label} · ${Math.round(d.confidence * 100)}%`)
                .on('click', () => onSelectRef.current(d.id))
                .addTo(group);
        });
        // Planning layers frame the view; the live UAV marker should not keep re-zooming it.
        map.current.fitBounds(bounds.pad(0.15), {maxZoom: 16});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, area, mission.driftRadiusMeters, mission.lkpLatitude, mission.lkpLongitude, home?.lat, home?.lng, plan, detections, selectedId]);

    useEffect(() => {
        const L = leaflet.current;
        const group = uavLayer.current;
        if (!ready || !L || !group) return;
        // The moving UAV lives on its own layer so telemetry polls never redraw the plan.
        group.clearLayers();
        if (!telemetry) return;
        L.marker([telemetry.latitude, telemetry.longitude], {
            keyboard: false, zIndexOffset: 1000,
            icon: L.divIcon({className: '', iconSize: [28, 28], iconAnchor: [14, 14],
                html: `<span style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;background:${telemetry.stale ? C.muted : C.blue};color:#fff;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgb(0 0 0/.4);transform:rotate(${telemetry.headingDeg ?? 0}deg);font:700 14px system-ui">&#9650;</span>`}),
        }).bindTooltip(mission.uavSerialNumber ?? 'UAV').addTo(group);
    }, [ready, telemetry, mission.uavSerialNumber]);

    return <div className="flex h-full flex-col overflow-hidden rounded-panel border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50 px-4 py-2.5">
            <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-900">{t('opsShared.sar.map.title')}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <button type="button" onClick={() => plan ? setPlan(null) : generate.mutate()} disabled={generate.isPending}
                        className={cn('flex items-center gap-1.5 rounded-control px-3 py-1.5 font-bold text-white transition disabled:opacity-60',
                            plan ? 'bg-primary hover:bg-primary-hover' : 'bg-uav-blue hover:bg-uav-blue-hover')}>
                    <Route size={14} aria-hidden="true"/>{plan ? t('opsShared.sar.map.clearPlan') : t('opsShared.sar.map.generatePlan')}</button>
                <MapLayerToolbar
                    variant="inline"
                    basemap={basemap}
                    onBasemapChange={setBasemap}
                    onResetView={() => map.current?.setView(lkp, 15)}
                />
            </div>
        </div>
        <div ref={container} className="relative z-0 min-h-[380px] flex-1" role="application" aria-label={t('opsShared.sar.map.aria', {code: mission.missionCode})}/>
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border px-4 py-3 text-[11px] sm:grid-cols-4">
            <Stat label={t('opsShared.sar.map.lkp')} value={`${mission.lkpLatitude.toFixed(5)}, ${mission.lkpLongitude.toFixed(5)}`}/>
            <Stat label={t('opsShared.sar.map.drift')} value={mission.driftRadiusMeters ? `${formatNumber(mission.driftRadiusMeters)} m` : '—'}/>
            <Stat label={t('opsShared.sar.map.toHome')} value={toHome != null ? `${formatNumber(Math.round(toHome))} m` : '—'}/>
            <div className="min-w-0">
                <dt className="font-semibold uppercase tracking-wide text-slate-500">{t('opsShared.sar.map.areaCheck')}</dt>
                <dd className={cn('m-0 flex items-center gap-1 font-bold', insideArea == null ? 'text-slate-500' : insideArea ? 'text-uav-blue' : 'text-primary')}>
                    {insideArea == null ? '—' : insideArea
                        ? <><ShieldCheck size={12} aria-hidden="true"/>{t('opsShared.sar.map.inside')}</>
                        : <><ShieldAlert size={12} aria-hidden="true"/>{t('opsShared.sar.map.outside')}</>}
                </dd>
            </div>
            {plan && <p className="col-span-full m-0 text-slate-500">{t('opsShared.sar.map.planSummary', {
                legs: plan.waypoints.length - 1, distance: formatNumber(plan.totalDistanceMeters), minutes: plan.estimatedFlightMinutes, sweep: plan.sweepWidthMeters,
            })}</p>}
        </dl>
    </div>;
}

function Stat({label, value}: { label: string; value: string }) {
    return <div className="min-w-0">
        <dt className="font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="m-0 truncate font-bold tabular-nums text-slate-900">{value}</dd>
    </div>;
}
