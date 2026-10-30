'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect, useRef, useState} from 'react';
import type {Control, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {Circle as CircleIcon, Crosshair, Hexagon, MapPin, Trash2, Undo2} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {MAP_BASEMAP_ORDER, MAP_BASEMAPS, syncScaleControl, useMapConfig} from '@/lib/map-config';
import {cn} from '@/lib/utils';
import {defaultFlightPlan, radiusLimits, type FlightPlanInput} from '@/features/missions/types/flight-plan.types';
import type {PlannerTool} from '@/features/missions/types/mission.types';
import type {Basemap} from '@/types';
import {flightGeometry} from '@/features/missions/utils/flight-geometry';

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * GIS flight area planner: a takeoff/landing zone plus an optional survey polygon or radius circle. Emits the plan
 * and its centre, which becomes the mission's map point.
 */
export function LocationPicker({plan, fallbackLatitude, fallbackLongitude, onChange}: {
    plan?: FlightPlanInput;
    fallbackLatitude?: number;
    fallbackLongitude?: number;
    onChange: (plan: FlightPlanInput, center: [number, number] | null) => void;
}) {
    const {t, formatNumber} = useI18n();
    const {config, basemap, setBasemap} = useMapConfig();
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap | null>(null);
    const tiles = useRef<TileLayer | null>(null);
    const overlay = useRef<LayerGroup | null>(null);
    const scaleControl = useRef<Control.Scale | null>(null);
    const leaflet = useRef<typeof import('leaflet') | null>(null);
    const [ready, setReady] = useState(false);
    const [tool, setTool] = useState<PlannerTool>(plan?.areaType === 'POLYGON' || plan?.areaType === 'CIRCLE' ? plan.areaType : 'takeoff');
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<'' | 'unsupported' | 'failed'>('');
    const current: FlightPlanInput = plan ?? {
        ...defaultFlightPlan(),
        ...(fallbackLatitude != null && fallbackLongitude != null ? {takeoffLatitude: fallbackLatitude, takeoffLongitude: fallbackLongitude} : {}),
    };
    const latest = useRef({current, tool, onChange});
    useEffect(() => {
        latest.current = {current, tool, onChange};
    });
    const geometry = flightGeometry(current);
    const emit = (next: FlightPlanInput) => latest.current.onChange(next, flightGeometry(next).center);

    useEffect(() => {
        let disposed = false;
        let resizeObserver: ResizeObserver | null = null;
        void import('leaflet').then(L => {
            if (disposed || !container.current || map.current) return;
            leaflet.current = L;
            const start = geometry.center ?? config.defaultCenter;
            const instance = L.map(container.current, {scrollWheelZoom: false}).setView(start, geometry.center ? 15 : config.defaultZoom);
            overlay.current = L.layerGroup().addTo(instance);
            instance.on('click', event => {
                const point: [number, number] = [round(event.latlng.lat), round(event.latlng.lng)];
                const {current: p, tool: active} = latest.current;
                if (active === 'takeoff') emit({...p, takeoffLatitude: point[0], takeoffLongitude: point[1]});
                else if (active === 'POLYGON') emit({...p, areaType: 'POLYGON', radiusMeters: undefined,
                    vertices: [...(p.areaType === 'POLYGON' ? p.vertices : []), point]});
                else emit({...p, areaType: 'CIRCLE', vertices: [point], radiusMeters: p.radiusMeters ?? 300});
            });
            map.current = instance;
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
            map.current?.remove();
            map.current = null;
            tiles.current = null;
        };
        // The map is created once; plan changes are drawn by the effect below.
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
        const L = leaflet.current;
        if (!ready || !L || !map.current) return;
        syncScaleControl(L, map.current, scaleControl, config.showScaleBar);
    }, [ready, config.showScaleBar]);

    useEffect(() => {
        const L = leaflet.current;
        const group = overlay.current;
        if (!ready || !L || !group) return;
        group.clearLayers();
        const area = {color: '#c43a4a', weight: 2, fillColor: '#c43a4a', fillOpacity: 0.15};
        if (current.areaType === 'POLYGON' && current.vertices.length) {
            if (current.vertices.length >= 3) L.polygon(current.vertices, area).addTo(group);
            else L.polyline(current.vertices, {color: '#c43a4a', weight: 2, dashArray: '6 4'}).addTo(group);
            current.vertices.forEach(v => L.circleMarker(v, {radius: 4, color: '#fff', weight: 2, fillColor: '#c43a4a', fillOpacity: 1}).addTo(group));
        }
        if (current.areaType === 'CIRCLE' && current.vertices.length === 1 && current.radiusMeters) {
            L.circle(current.vertices[0], {...area, radius: current.radiusMeters}).addTo(group);
        }
        if (current.takeoffLatitude != null && current.takeoffLongitude != null) {
            L.marker([current.takeoffLatitude, current.takeoffLongitude], {
                keyboard: false,
                icon: L.divIcon({className: '', iconSize: [26, 26], iconAnchor: [13, 13],
                    html: '<span style="display:flex;width:26px;height:26px;align-items:center;justify-content:center;background:#475569;color:#fff;font:700 11px system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgb(0 0 0/.4)">H</span>'}),
            }).addTo(group);
        }
    }, [ready, current.areaType, current.vertices, current.radiusMeters, current.takeoffLatitude, current.takeoffLongitude]);

    const locate = () => {
        if (!navigator.geolocation) {
            setLocateError('unsupported');
            return;
        }
        setLocating(true);
        setLocateError('');
        navigator.geolocation.getCurrentPosition(position => {
            setLocating(false);
            const point: [number, number] = [round(position.coords.latitude), round(position.coords.longitude)];
            emit({...latest.current.current, takeoffLatitude: point[0], takeoffLongitude: point[1]});
            map.current?.setView(point, 16);
        }, () => {
            setLocating(false);
            setLocateError('failed');
        }, {timeout: 10_000});
    };

    const chooseTool = (next: PlannerTool) => {
        setTool(next);
        if (next === 'takeoff') return;
        // Switching area shape starts that shape fresh; the takeoff point is kept.
        if (current.areaType !== next) emit({...current, areaType: next, vertices: [], radiusMeters: next === 'CIRCLE' ? current.radiusMeters ?? 300 : undefined});
    };
    const clearArea = () => emit({...current, areaType: 'POINT', vertices: [], radiusMeters: undefined});
    const area = geometry.areaSquareMeters;
    // The hint explains the next click; once the chosen tool has what it needs it only adds noise.
    const toolDone = tool === 'takeoff'
        ? current.takeoffLatitude != null && current.takeoffLongitude != null
        : current.areaType === tool && current.vertices.length >= (tool === 'POLYGON' ? 3 : 1);
    const tools: { id: PlannerTool; icon: typeof MapPin; label: string }[] = [
        {id: 'takeoff', icon: MapPin, label: t('planner.tool.takeoff')},
        {id: 'POLYGON', icon: Hexagon, label: t('planner.tool.polygon')},
        {id: 'CIRCLE', icon: CircleIcon, label: t('planner.tool.circle')},
    ];

    return <div className="col-span-full grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-foreground">
            <span>{t('planner.label')}</span>
            <button type="button" className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline disabled:opacity-55" onClick={locate} disabled={locating}>
                <Crosshair size={14} aria-hidden="true"/>{locating ? t('map.locating') : t('planner.takeoffHere')}
            </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex border border-border bg-card" role="radiogroup" aria-label={t('planner.toolLabel')}>
                {tools.map(({id, icon: Icon, label}) => <button key={id} type="button" role="radio" aria-checked={tool === id} onClick={() => chooseTool(id)}
                                                              className={cn('inline-flex h-9 items-center gap-1.5 px-3 text-xs font-semibold',
                                                                  tool === id ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-50')}>
                    <Icon size={14} aria-hidden="true"/>{label}</button>)}
            </div>
            {tool === 'POLYGON' && current.areaType === 'POLYGON' && current.vertices.length > 0 &&
                <button type="button" onClick={() => emit({...current, vertices: current.vertices.slice(0, -1)})}
                        className="inline-flex h-9 items-center gap-1.5 border border-border bg-card px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    <Undo2 size={14} aria-hidden="true"/>{t('planner.undo')}</button>}
            {current.areaType !== 'POINT' &&
                <button type="button" onClick={clearArea}
                        className="inline-flex h-9 items-center gap-1.5 border border-border bg-card px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    <Trash2 size={14} aria-hidden="true"/>{t('planner.clearArea')}</button>}
            <label className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-slate-600">{t('planner.basemap')}
                <select value={basemap} onChange={e => setBasemap(e.target.value as Basemap)} className="h-9 border border-border bg-card px-2 text-xs">
                    {MAP_BASEMAP_ORDER.map(b => <option key={b} value={b}>{t(`planner.basemaps.${b}`)}</option>)}
                </select></label>
        </div>
        {tool === 'CIRCLE' && <label className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            {t('planner.radius')}
            <input type="range" min={radiusLimits.min} max={radiusLimits.max} step={50} value={current.radiusMeters ?? 300}
                   onChange={e => emit({...current, areaType: 'CIRCLE', radiusMeters: Number(e.target.value)})} className="flex-1 accent-primary"/>
            <span className="w-16 text-right tabular-nums text-foreground">{current.radiusMeters ?? 300} m</span>
        </label>}
        <div ref={container} className="z-0 h-72 w-full border border-border-input sm:h-96" role="application" aria-label={t('planner.ariaLabel')}/>
        <dl className="m-0 grid grid-cols-2 gap-px border border-border bg-border text-xs sm:grid-cols-4">
            <Stat label={t('planner.area')} value={area != null
                ? `${formatNumber(Math.round(area))} m² · ${formatNumber(Math.round(area / 100) / 100)} ha` : '—'}/>
            <Stat label={t('planner.perimeter')} value={geometry.perimeterMeters != null ? `${formatNumber(Math.round(geometry.perimeterMeters))} m` : '—'}/>
            <Stat label={t('planner.center')} value={geometry.center ? `${geometry.center[0].toFixed(6)}, ${geometry.center[1].toFixed(6)}` : '—'}/>
            <Stat label={t('planner.takeoff')} value={current.takeoffLatitude != null && current.takeoffLongitude != null
                ? `${current.takeoffLatitude.toFixed(6)}, ${current.takeoffLongitude.toFixed(6)}` : '—'}/>
        </dl>
        {!toolDone && <p className="m-0 text-sm text-muted">{t(`planner.hint.${tool}`)}</p>}
        {locateError && <p className="m-0 text-sm leading-normal text-danger" role="alert">{t(locateError === 'unsupported' ? 'map.unsupported' : 'map.locateFailed')}</p>}
    </div>;
}

function Stat({label, value}: { label: string; value: string }) {
    return <div className="bg-card px-3 py-2">
        <dt className="text-[11px] text-slate-500">{label}</dt>
        <dd className="m-0 font-semibold tabular-nums text-foreground">{value}</dd>
    </div>;
}
