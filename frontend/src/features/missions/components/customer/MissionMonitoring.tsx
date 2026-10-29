'use client';

import 'leaflet/dist/leaflet.css';
import {useEffect, useRef, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {Control, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {Battery, Gauge, Mountain, Navigation, Radio, Timer} from 'lucide-react';
import {MapLayerToolbar} from '@/components/shared/MapLayerToolbar';
import {useI18n} from '@/contexts/I18nContext';
import {TELEMETRY_POLL_MS, telemetryService} from '@/lib/api/services';
import {calculateHaversineDistance} from '@/features/sar/utils/sarAlgorithms';
import type {UavTelemetry} from '@/features/uavs/types/telemetry.types';
import type {Mission} from '@/features/missions/types/mission.types';
import {formatTelemetryNumber} from '@/lib/format';
import {MAP_BASEMAPS, syncScaleControl, useMapConfig} from '@/lib/map-config';
import {cn} from '@/lib/utils';

const LIVE_STATUSES = ['READY', 'IN_PROGRESS'];
// Leaflet styles vectors through options, so the theme colours are spelled out here.
const C = {red: '#c43a4a', blue: '#475569', muted: '#94a3b8'};

/** The customer's view of the flight: planned area, the assigned UAV's live position and its reported values. */
export function MissionMonitoring({mission}: { mission: Mission }) {
    const {t, formatNumber, formatDate} = useI18n();
    const live = LIVE_STATUSES.includes(mission.status);
    const telemetry = useQuery({
        queryKey: ['mission', mission.id, 'telemetry'],
        queryFn: ({signal}) => telemetryService.forMission(mission.id, signal).then(v => v ?? null),
        enabled: mission.uavId != null && mission.status !== 'DRAFT' && mission.status !== 'PENDING_CONFIRMATION',
        refetchInterval: live ? TELEMETRY_POLL_MS : false,
        retry: false,
    });
    const fix = telemetry.data ?? null;
    // A sample from another mission of the same UAV says nothing about this one.
    const ownFix = fix && (fix.missionId == null || fix.missionId === mission.id) ? fix : null;
    const plan = mission.flightPlan ?? null;
    const center: [number, number] | null = plan ? [plan.centerLatitude, plan.centerLongitude]
        : mission.latitude != null && mission.longitude != null ? [mission.latitude, mission.longitude] : null;
    const toArea = ownFix && center
        ? calculateHaversineDistance({lat: ownFix.latitude, lng: ownFix.longitude}, {lat: center[0], lng: center[1]})
        : null;
    const num = (v: number | null | undefined, digits = 1) => formatTelemetryNumber(v, formatNumber, digits);

    const notice = mission.uavId == null ? t('missionMonitor.noUav')
        : !live && !['COMPLETED', 'FAILED'].includes(mission.status) ? t('missionMonitor.beforeFlight')
            : telemetry.isPending ? t('missionMonitor.loading')
                : telemetry.isError ? t('missionMonitor.loadError')
                    : !ownFix ? (live ? t('missionMonitor.waiting') : t('missionMonitor.noTrack'))
                        : ownFix.stale && live ? t('missionMonitor.stale', {seconds: formatNumber(ownFix.ageSeconds)})
                            : null;

    return <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={cn('inline-flex items-center gap-2 rounded-panel border px-3 py-1 text-xs font-bold',
                live && ownFix && !ownFix.stale ? 'border-blue-200 bg-uav-blue-light text-uav-blue' : 'border-border bg-background text-muted')}>
                <span className={cn('h-2 w-2 rounded-full', live && ownFix && !ownFix.stale ? 'animate-pulse bg-uav-blue' : 'bg-slate-300')} aria-hidden="true"/>
                {live && ownFix && !ownFix.stale ? t('missionMonitor.live') : t(`missionMonitor.phase.${live ? 'live' : mission.status === 'COMPLETED' || mission.status === 'FAILED' ? 'ended' : 'planned'}`)}
            </span>
            {ownFix && <span className="text-xs text-muted">{t('missionMonitor.updated', {at: formatDate(ownFix.recordedAt, {timeStyle: 'medium'})})}</span>}
        </div>
        {notice && <p role="status" className="m-0 rounded-panel border-l-4 border-l-uav-amber bg-uav-amber-light px-3.5 py-2.5 text-sm text-amber-900">{notice}</p>}

        <FlightMap mission={mission} fix={ownFix} center={center}/>

        {ownFix && <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat icon={<Mountain size={15}/>} label={t('missionMonitor.altitude')} value={ownFix.altitudeAglMeters == null ? '—' : `${num(ownFix.altitudeAglMeters, 0)} m`}
                  hint={plan ? t('missionMonitor.planned', {value: `${plan.altitudeAglMeters} m`}) : undefined}/>
            <Stat icon={<Gauge size={15}/>} label={t('missionMonitor.speed')} value={ownFix.groundSpeedMs == null ? '—' : `${num(ownFix.groundSpeedMs)} m/s`}/>
            <Stat icon={<Battery size={15}/>} label={t('missionMonitor.battery')} value={ownFix.batteryPct == null ? '—' : `${ownFix.batteryPct}%`}
                  tone={ownFix.batteryPct != null && ownFix.batteryPct <= 25 ? 'text-primary' : undefined}/>
            <Stat icon={<Navigation size={15}/>} label={t('missionMonitor.toArea')} value={toArea == null ? '—' : `${formatNumber(Math.round(toArea))} m`}/>
            <Stat icon={<Radio size={15}/>} label={t('missionMonitor.gnss')} value={ownFix.rtkStatus ?? '—'}
                  hint={ownFix.satellites != null ? t('missionMonitor.satellites', {count: ownFix.satellites}) : undefined}/>
            <Stat icon={<Timer size={15}/>} label={t('missionMonitor.age')} value={t('missionMonitor.seconds', {count: formatNumber(ownFix.ageSeconds)})}
                  tone={ownFix.stale ? 'text-amber-700' : undefined}/>
        </dl>}

        {plan && <div className="rounded-panel border border-border bg-background p-4">
            <h3 className="m-0 mb-2 text-sm font-bold text-foreground">{t('missionMonitor.planTitle')}</h3>
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-4 [&_dt]:text-xs [&_dt]:text-muted [&_dd]:m-0 [&_dd]:font-semibold [&_dd]:text-foreground">
                <div><dt>{t('missionMonitor.area')}</dt><dd>{plan.areaSquareMeters ? `${formatNumber(Math.round(plan.areaSquareMeters / 100) / 100)} ha` : t(`missionMonitor.areaType.${plan.areaType}`)}</dd></div>
                <div><dt>{t('missionMonitor.altitude')}</dt><dd>{plan.altitudeAglMeters} m · GSD {plan.targetGsdCm} cm</dd></div>
                <div><dt>{t('missionMonitor.overlap')}</dt><dd>{plan.forwardOverlap}% / {plan.sideOverlap}%</dd></div>
                <div><dt>{t('missionMonitor.sensors')}</dt><dd>{plan.sensors.map(s => t(`flightSpec.sensor.${s}.name`)).join(', ')}</dd></div>
            </dl>
        </div>}
    </div>;
}

function FlightMap({mission, fix, center}: { mission: Mission; fix: UavTelemetry | null; center: [number, number] | null }) {
    const {t} = useI18n();
    const {config, basemap, setBasemap} = useMapConfig();
    const container = useRef<HTMLDivElement | null>(null);
    const map = useRef<LeafletMap | null>(null);
    const tiles = useRef<TileLayer | null>(null);
    const planLayer = useRef<LayerGroup | null>(null);
    const uavLayer = useRef<LayerGroup | null>(null);
    const scaleControl = useRef<Control.Scale | null>(null);
    const leaflet = useRef<typeof import('leaflet') | null>(null);
    const [ready, setReady] = useState(false);
    const plan = mission.flightPlan ?? null;
    const effectiveCenter: [number, number] = center ?? config.defaultCenter;

    useEffect(() => {
        let disposed = false;
        let resizeObserver: ResizeObserver | null = null;
        void import('leaflet').then(L => {
            if (disposed || !container.current || map.current) return;
            leaflet.current = L;
            map.current = L.map(container.current, {scrollWheelZoom: false}).setView(effectiveCenter, center ? 15 : config.defaultZoom);
            planLayer.current = L.layerGroup().addTo(map.current);
            uavLayer.current = L.layerGroup().addTo(map.current);
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
            disposed = true;
            resizeObserver?.disconnect();
            scaleControl.current = null;
            tiles.current = null;
            map.current?.remove();
            map.current = null;
        };
        // One map per mission view; layers below follow the data.
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
        const group = planLayer.current;
        if (!ready || !L || !group || !map.current || !center) return;
        group.clearLayers();
        const bounds = L.latLngBounds([center]);
        const area = {color: C.red, weight: 2, fillColor: C.red, fillOpacity: 0.12};
        if (plan?.areaType === 'POLYGON' && plan.vertices.length >= 3) {
            L.polygon(plan.vertices, area).bindTooltip(t('missionMonitor.flightArea')).addTo(group);
            plan.vertices.forEach(v => bounds.extend(v));
        } else if (plan?.areaType === 'CIRCLE' && plan.vertices.length === 1 && plan.radiusMeters) {
            const circle = L.circle(plan.vertices[0], {...area, radius: plan.radiusMeters}).bindTooltip(t('missionMonitor.flightArea')).addTo(group);
            bounds.extend(circle.getBounds());
        } else {
            L.circleMarker(center, {radius: 7, color: '#fff', weight: 2, fillColor: C.red, fillOpacity: 1}).bindTooltip(mission.locationName).addTo(group);
        }
        if (plan?.takeoffLatitude != null && plan.takeoffLongitude != null) {
            L.marker([plan.takeoffLatitude, plan.takeoffLongitude], {keyboard: false, icon: L.divIcon({className: '', iconSize: [24, 24], iconAnchor: [12, 12],
                html: `<span style="display:flex;width:24px;height:24px;align-items:center;justify-content:center;background:${C.blue};color:#fff;font:700 11px system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgb(0 0 0/.4)">H</span>`})})
                .bindTooltip(t('missionMonitor.takeoff')).addTo(group);
            bounds.extend([plan.takeoffLatitude, plan.takeoffLongitude]);
        }
        map.current.fitBounds(bounds.pad(0.25), {maxZoom: 16});
    }, [ready, plan, center, mission.locationName, t]);

    useEffect(() => {
        const L = leaflet.current;
        const group = uavLayer.current;
        if (!ready || !L || !group) return;
        group.clearLayers();
        if (!fix) return;
        L.marker([fix.latitude, fix.longitude], {keyboard: false, zIndexOffset: 1000, icon: L.divIcon({className: '', iconSize: [28, 28], iconAnchor: [14, 14],
            html: `<span style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;background:${fix.stale ? C.muted : C.blue};color:#fff;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgb(0 0 0/.4);transform:rotate(${fix.headingDeg ?? 0}deg);font:700 14px system-ui">&#9650;</span>`})})
            .bindTooltip(t('missionMonitor.uav')).addTo(group);
    }, [ready, fix, t]);

    if (!center) return <p className="m-0 rounded-panel border border-dashed border-border px-4 py-8 text-center text-sm text-muted">{t('missionMonitor.noLocation')}</p>;
    return (
        <div className="relative isolate h-[360px] overflow-hidden rounded-panel border border-border">
            <MapLayerToolbar
                variant="overlay"
                basemap={basemap}
                onBasemapChange={setBasemap}
                onResetView={() => map.current?.setView(center, 15)}
            />
            <div ref={container} className="z-0 h-full w-full" role="application" aria-label={t('missionMonitor.mapAria', {code: mission.code})}/>
        </div>
    );
}

function Stat({icon, label, value, hint, tone}: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: string }) {
    return <div className="rounded-panel border border-border bg-background p-3.5">
        <dt className="flex items-center gap-1.5 text-xs text-muted"><span className="text-slate-400" aria-hidden="true">{icon}</span>{label}</dt>
        <dd className={cn('m-0 mt-1 text-xl font-extrabold tabular-nums', tone ?? 'text-foreground')}>{value}</dd>
        {hint && <dd className="m-0 mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>;
}
