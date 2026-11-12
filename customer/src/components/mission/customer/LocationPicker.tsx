'use client';
import 'leaflet/dist/leaflet.css';
import {useEffect, useMemo, useRef, useState, type ClipboardEvent} from 'react';
import type {Control, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {Card, FormField, Input} from '@/components/ui';
import {LocationPickerSummary, LocationPickerToolbar} from '@/components/mission/customer/LocationPickerControls';
import {
    nextPlanFromMapClick,
    parseCoordinate,
    parsePastedCoordinatePair,
    renderFlightPlanOverlay,
    roundCoord,
} from '@/components/mission/customer/location-picker-helpers';
import {useAirspaceZones} from '@/hooks/airspace/useAirspace';
import {MAP_BASEMAPS, syncScaleControl, useMapConfig} from '@/lib/map-config';
import {useI18n} from '@/providers/I18nContext';
import {defaultFlightPlan, type FlightPlanInput} from '@/types/mission/flight-plan.types';
import type {PlannerTool} from '@/types/mission/mission.types';
import {renderAirspaceZonesLayer} from '@/utils/airspace/map-overlays';
import {flightGeometry} from '@/utils/mission/flight-geometry';

/**
 * GIS flight area planner: a takeoff/landing zone plus an optional survey polygon or radius circle. Emits the plan
 * and its centre, which becomes the mission's map point.
 */
export function LocationPicker({
    plan,
    fallbackLatitude,
    fallbackLongitude,
    latitudeInvalid,
    latitudeErrorId,
    longitudeInvalid,
    longitudeErrorId,
    onChange,
}: {
    plan?: FlightPlanInput;
    fallbackLatitude?: number;
    fallbackLongitude?: number;
    latitudeInvalid?: boolean;
    latitudeErrorId?: string;
    longitudeInvalid?: boolean;
    longitudeErrorId?: string;
    onChange: (plan: FlightPlanInput, center: [number, number] | null) => void;
}) {
    const {t, formatNumber} = useI18n();
    const {config, basemap, setBasemap} = useMapConfig();
    const airspaceZonesQuery = useAirspaceZones(true);
    const activeAirspaceZones = useMemo(() => airspaceZonesQuery.data ?? [], [airspaceZonesQuery.data]);
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap | null>(null);
    const tiles = useRef<TileLayer | null>(null);
    const airspaceLayer = useRef<LayerGroup | null>(null);
    const overlay = useRef<LayerGroup | null>(null);
    const scaleControl = useRef<Control.Scale | null>(null);
    const leaflet = useRef<typeof import('leaflet') | null>(null);
    const [ready, setReady] = useState(false);
    const [tool, setTool] = useState<PlannerTool>(plan?.areaType === 'POLYGON' || plan?.areaType === 'CIRCLE' ? plan.areaType : 'takeoff');
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<'' | 'unsupported' | 'failed'>('');
    const current = useMemo<FlightPlanInput>(
        () =>
            plan ?? {
                ...defaultFlightPlan(),
                ...(fallbackLatitude != null && fallbackLongitude != null
                    ? {takeoffLatitude: fallbackLatitude, takeoffLongitude: fallbackLongitude}
                    : {}),
            },
        [plan, fallbackLatitude, fallbackLongitude],
    );
    const propLat = current.takeoffLatitude;
    const propLng = current.takeoffLongitude;
    const [prevCoords, setPrevCoords] = useState<{ lat?: number; lng?: number }>({lat: propLat, lng: propLng});
    const [latInput, setLatInput] = useState(propLat != null ? String(propLat) : '');
    const [lngInput, setLngInput] = useState(propLng != null ? String(propLng) : '');
    if (prevCoords.lat !== propLat || prevCoords.lng !== propLng) {
        setPrevCoords({lat: propLat, lng: propLng});
        if (propLat !== (parseCoordinate(latInput, 90) ?? undefined)) setLatInput(propLat != null ? String(propLat) : '');
        if (propLng !== (parseCoordinate(lngInput, 180) ?? undefined)) setLngInput(propLng != null ? String(propLng) : '');
    }
    const latest = useRef({current, tool, onChange});
    useEffect(() => {
        latest.current = {current, tool, onChange};
    });
    const geometry = flightGeometry(current);
    const emit = (next: FlightPlanInput) => latest.current.onChange(next, flightGeometry(next).center);

    const applyCoords = (nextLatRaw: string, nextLngRaw: string) => {
        setLatInput(nextLatRaw);
        setLngInput(nextLngRaw);
        const lat = parseCoordinate(nextLatRaw, 90);
        const lng = parseCoordinate(nextLngRaw, 180);
        const nextPlan: FlightPlanInput = {
            ...current,
            takeoffLatitude: nextLatRaw.trim() === '' ? undefined : lat ?? current.takeoffLatitude,
            takeoffLongitude: nextLngRaw.trim() === '' ? undefined : lng ?? current.takeoffLongitude,
            ...(current.areaType === 'CIRCLE' && lat != null && lng != null ? {vertices: [[lat, lng]]} : {}),
        };
        emit(nextPlan);
        if (lat != null && lng != null && map.current) {
            map.current.setView([lat, lng], Math.max(map.current.getZoom(), 15));
        }
    };

    const handleCoordPaste = (event: ClipboardEvent<HTMLInputElement>) => {
        const pair = parsePastedCoordinatePair(event.clipboardData.getData('text'));
        if (!pair) return;
        event.preventDefault();
        applyCoords(String(pair[0]), String(pair[1]));
    };

    useEffect(() => {
        let disposed = false;
        let resizeObserver: ResizeObserver | null = null;
        void import('leaflet').then(L => {
            if (disposed || !container.current || map.current) return;
            leaflet.current = L;
            const start = geometry.center ?? config.defaultCenter;
            const instance = L.map(container.current, {scrollWheelZoom: false}).setView(start, geometry.center ? 15 : config.defaultZoom);
            airspaceLayer.current = L.layerGroup().addTo(instance);
            overlay.current = L.layerGroup().addTo(instance);
            instance.on('click', event => {
                const point: [number, number] = [roundCoord(event.latlng.lat), roundCoord(event.latlng.lng)];
                emit(nextPlanFromMapClick(latest.current.current, latest.current.tool, point));
            });
            map.current = instance;
            setReady(true);
            if (typeof ResizeObserver !== 'undefined' && container.current) {
                resizeObserver = new ResizeObserver(() => map.current?.invalidateSize());
                resizeObserver.observe(container.current);
            }
            setTimeout(() => map.current?.invalidateSize(), 100);
            setTimeout(() => map.current?.invalidateSize(), 350);
        });
        return () => {
            disposed = true;
            resizeObserver?.disconnect();
            scaleControl.current = null;
            airspaceLayer.current = null;
            overlay.current = null;
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
        const group = airspaceLayer.current;
        if (!ready || !L || !group) return;
        renderAirspaceZonesLayer(L, group, activeAirspaceZones, t, formatNumber);
    }, [ready, activeAirspaceZones, t, formatNumber]);

    useEffect(() => {
        const L = leaflet.current;
        const group = overlay.current;
        if (!ready || !L || !group) return;
        renderFlightPlanOverlay(L, group, current);
    }, [ready, current]);

    const locate = () => {
        if (!navigator.geolocation) {
            setLocateError('unsupported');
            return;
        }
        setLocating(true);
        setLocateError('');
        navigator.geolocation.getCurrentPosition(position => {
            setLocating(false);
            const point: [number, number] = [roundCoord(position.coords.latitude), roundCoord(position.coords.longitude)];
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
    // The hint explains the next click; once the chosen tool has what it needs it only adds noise.
    const toolDone = tool === 'takeoff'
        ? current.takeoffLatitude != null && current.takeoffLongitude != null
        : current.areaType === tool && current.vertices.length >= (tool === 'POLYGON' ? 3 : 1);
    const coordInputClass = 'h-9 px-3 font-mono text-sm tabular-nums text-foreground aria-[invalid=true]:border-danger';

    return (
        <div className="col-span-full grid gap-2">
            <LocationPickerToolbar
                current={current}
                tool={tool}
                basemap={basemap}
                locating={locating}
                onLocate={locate}
                onChooseTool={chooseTool}
                onUndoVertex={() => emit({...current, vertices: current.vertices.slice(0, -1)})}
                onClearArea={clearArea}
                onBasemapChange={setBasemap}
                onRadiusChange={radiusMeters => emit({...current, areaType: 'CIRCLE', radiusMeters})}
            />
            <Card variant="surface" className="grid gap-2 border-border bg-slate-50/60 p-3 sm:grid-cols-2">
                <FormField id="mission-latitude" label={t('planner.latitude')} optional={false}>
                    <Input
                        id="mission-latitude"
                        type="number"
                        min={-90}
                        max={90}
                        step="any"
                        inputMode="decimal"
                        value={latInput}
                        aria-invalid={latitudeInvalid || undefined}
                        aria-describedby={latitudeErrorId ? `${latitudeErrorId} mission-coord-hint` : 'mission-coord-hint'}
                        onChange={e => applyCoords(e.target.value, lngInput)}
                        onPaste={handleCoordPaste}
                        placeholder="21.028500"
                        className={coordInputClass}
                    />
                </FormField>
                <FormField id="mission-longitude" label={t('planner.longitude')} optional={false}>
                    <Input
                        id="mission-longitude"
                        type="number"
                        min={-180}
                        max={180}
                        step="any"
                        inputMode="decimal"
                        value={lngInput}
                        aria-invalid={longitudeInvalid || undefined}
                        aria-describedby={longitudeErrorId ? `${longitudeErrorId} mission-coord-hint` : 'mission-coord-hint'}
                        onChange={e => applyCoords(latInput, e.target.value)}
                        onPaste={handleCoordPaste}
                        placeholder="105.854200"
                        className={coordInputClass}
                    />
                </FormField>
                <p id="mission-coord-hint" className="col-span-full m-0 text-xs text-slate-500">{t('planner.coordHint')}</p>
            </Card>
            <div ref={container} className="z-0 h-72 w-full border border-border-input sm:h-96" role="application" aria-label={t('planner.ariaLabel')}/>
            <LocationPickerSummary
                activeZoneCount={activeAirspaceZones.length}
                areaSquareMeters={geometry.areaSquareMeters}
                perimeterMeters={geometry.perimeterMeters}
                center={geometry.center}
                takeoffLatitude={current.takeoffLatitude}
                takeoffLongitude={current.takeoffLongitude}
                tool={tool}
                toolDone={toolDone}
                locateError={locateError}
            />
        </div>
    );
}
