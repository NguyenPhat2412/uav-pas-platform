'use client';

import 'leaflet/dist/leaflet.css';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {FeatureGroup, LayerGroup, Map as LeafletMap, TileLayer} from 'leaflet';
import {Crosshair, Maximize2, RotateCcw, Trash2} from 'lucide-react';
import {Badge, Button, Card, CardDescription, CardHeader, CardTitle} from '@/components/ui';
import {MapLayerToolbar} from '@/components/shared/MapLayerToolbar';
import {AirspaceDraftFooter, AirspaceMapLegend} from '@/components/airspace/AirspaceMapLegend';
import {
    applyDraftMapClick,
    fitFeatureGroupBounds,
    parseDraftVerticesPreview,
    renderDraftGeometryLayer,
    renderNeighborZonesLayer,
    renderOverviewZonesLayer,
    syncBasemapTileLayer,
} from '@/components/airspace/airspace-map-layers';
import {formatPolygonVerticesText, type AirspaceZoneDraft} from '@/forms/airspace/airspace-zone-form';
import {syncScaleControl, useMapConfig} from '@/lib/map-config';
import {useI18n} from '@/providers/I18nContext';
import type {AirspaceZone} from '@/types/airspace/airspace.types';

export {parseDraftVerticesPreview};

export function AirspaceOverviewMap({
    zones,
    onSelectZone,
}: {
    zones: readonly AirspaceZone[];
    onSelectZone: (zone: AirspaceZone) => void;
}) {
    const {t, formatNumber} = useI18n();
    const {config, basemap, setBasemap} = useMapConfig();
    const containerRef = useRef<HTMLDivElement>(null);
    const leafletRef = useRef<typeof import('leaflet') | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const tileRef = useRef<TileLayer | null>(null);
    const groupRef = useRef<FeatureGroup | null>(null);
    const scaleRef = useRef<import('leaflet').Control.Scale | null>(null);
    const fittedOnceRef = useRef(false);
    const selectRef = useRef(onSelectZone);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        selectRef.current = onSelectZone;
    }, [onSelectZone]);

    useEffect(() => {
        let cancelled = false;
        let resize: ResizeObserver | undefined;
        void import('leaflet').then(L => {
            if (cancelled || !containerRef.current || mapRef.current) return;
            leafletRef.current = L;
            const instance = L.map(containerRef.current, {scrollWheelZoom: false}).setView(
                config.defaultCenter,
                config.defaultZoom,
            );
            groupRef.current = L.featureGroup().addTo(instance);
            syncScaleControl(L, instance, scaleRef, config.showScaleBar);
            mapRef.current = instance;
            resize = new ResizeObserver(() => instance.invalidateSize());
            resize.observe(containerRef.current);
            setReady(true);
        });
        return () => {
            cancelled = true;
            resize?.disconnect();
            scaleRef.current = null;
            groupRef.current = null;
            tileRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!ready || !leafletRef.current || !mapRef.current) return;
        tileRef.current = syncBasemapTileLayer(leafletRef.current, mapRef.current, tileRef.current, basemap);
    }, [ready, basemap]);

    const fitAllZones = useCallback(() => {
        if (!mapRef.current || !groupRef.current) return;
        fitFeatureGroupBounds(mapRef.current, groupRef.current, config.defaultCenter, config.defaultZoom, 0.18, 15);
    }, [config.defaultCenter, config.defaultZoom]);

    useEffect(() => {
        if (!ready || !leafletRef.current || !groupRef.current) return;
        renderOverviewZonesLayer(leafletRef.current, groupRef.current, zones, t, formatNumber, zone =>
            selectRef.current(zone),
        );
        if (!fittedOnceRef.current && zones.length > 0) {
            fittedOnceRef.current = true;
            fitAllZones();
        }
    }, [ready, zones, t, formatNumber, fitAllZones]);

    return (
        <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2.5 space-y-0 bg-slate-50/70 px-4 py-3">
                <div className="min-w-0">
                    <CardTitle className="m-0 text-sm font-bold text-slate-900">
                        {t('airspace.admin.map.overviewTitle')}
                    </CardTitle>
                    <CardDescription className="m-0 mt-0.5 text-xs text-slate-500">
                        {t('airspace.admin.map.overviewHint')}
                    </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <AirspaceMapLegend />
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={fitAllZones}
                        leftIcon={<Maximize2 size={13} aria-hidden="true" />}
                        className="h-8 bg-white px-2.5 text-xs font-semibold text-slate-700"
                    >
                        {t('airspace.admin.map.fitAll')}
                    </Button>
                    <MapLayerToolbar basemap={basemap} onBasemapChange={setBasemap} />
                </div>
            </CardHeader>
            <div ref={containerRef} className="h-[340px] w-full bg-slate-100" />
        </Card>
    );
}

export function AirspaceDraftMap({
    draft,
    existingZones,
    editingZoneId,
    onChange,
}: {
    draft: AirspaceZoneDraft;
    existingZones: readonly AirspaceZone[];
    editingZoneId?: number | null;
    onChange: React.Dispatch<React.SetStateAction<AirspaceZoneDraft>>;
}) {
    const {t} = useI18n();
    const {config, basemap, setBasemap} = useMapConfig();
    const containerRef = useRef<HTMLDivElement>(null);
    const leafletRef = useRef<typeof import('leaflet') | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const tileRef = useRef<TileLayer | null>(null);
    const bgGroupRef = useRef<LayerGroup | null>(null);
    const fgGroupRef = useRef<FeatureGroup | null>(null);
    const draftRef = useRef(draft);
    const onChangeRef = useRef(onChange);
    const initializedViewRef = useRef(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        draftRef.current = draft;
    }, [draft]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    const polygonPoints = useMemo(() => parseDraftVerticesPreview(draft.verticesText), [draft.verticesText]);

    useEffect(() => {
        let cancelled = false;
        let resize: ResizeObserver | undefined;
        void import('leaflet').then(L => {
            if (cancelled || !containerRef.current || mapRef.current) return;
            leafletRef.current = L;
            const lat = Number(draftRef.current.centerLat);
            const lng = Number(draftRef.current.centerLng);
            const initialCenter: [number, number] =
                Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : config.defaultCenter;

            const instance = L.map(containerRef.current, {scrollWheelZoom: true}).setView(initialCenter, 13);
            bgGroupRef.current = L.layerGroup().addTo(instance);
            fgGroupRef.current = L.featureGroup().addTo(instance);

            instance.on('click', event => {
                const patch = applyDraftMapClick(draftRef.current, event.latlng.lat, event.latlng.lng);
                onChangeRef.current(prev => ({...prev, ...patch}));
            });

            mapRef.current = instance;
            resize = new ResizeObserver(() => instance.invalidateSize());
            resize.observe(containerRef.current);
            setReady(true);
        });

        return () => {
            cancelled = true;
            resize?.disconnect();
            bgGroupRef.current = null;
            fgGroupRef.current = null;
            tileRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!ready || !leafletRef.current || !mapRef.current) return;
        tileRef.current = syncBasemapTileLayer(leafletRef.current, mapRef.current, tileRef.current, basemap);
    }, [ready, basemap]);

    useEffect(() => {
        if (!ready || !leafletRef.current || !bgGroupRef.current) return;
        renderNeighborZonesLayer(leafletRef.current, bgGroupRef.current, existingZones, editingZoneId);
    }, [ready, existingZones, editingZoneId]);

    useEffect(() => {
        if (!ready || !leafletRef.current || !mapRef.current || !fgGroupRef.current) return;
        renderDraftGeometryLayer(leafletRef.current, fgGroupRef.current, draft, polygonPoints);
        if (!initializedViewRef.current) {
            initializedViewRef.current = true;
            const bounds = fgGroupRef.current.getBounds();
            if (bounds.isValid()) {
                mapRef.current.fitBounds(bounds.pad(0.28), {maxZoom: 14});
            }
        }
    }, [ready, draft, polygonPoints]);

    const handleUndoVertex = () => {
        if (polygonPoints.length === 0) return;
        onChange(prev => ({...prev, verticesText: formatPolygonVerticesText(polygonPoints.slice(0, -1))}));
    };

    return (
        <Card className="bg-white sm:col-span-2">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 bg-slate-50 px-3 py-2">
                <CardTitle className="m-0 inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Crosshair size={14} className="text-primary" aria-hidden="true" />
                    {t('airspace.admin.map.builderTitle')}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-1.5">
                    {draft.geometryType === 'POLYGON' && (
                        <>
                            <Badge variant="outline" size="sm" className="bg-white font-semibold normal-case tracking-normal text-slate-700">
                                {t('airspace.admin.map.vertexCount', {count: polygonPoints.length})}
                            </Badge>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={polygonPoints.length === 0}
                                onClick={handleUndoVertex}
                                leftIcon={<RotateCcw size={12} aria-hidden="true" />}
                                className="h-7 bg-white px-2 text-[11px]"
                            >
                                {t('airspace.admin.map.undoVertex')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                disabled={polygonPoints.length === 0}
                                onClick={() => onChange(prev => ({...prev, verticesText: ''}))}
                                leftIcon={<Trash2 size={12} aria-hidden="true" />}
                                className="h-7 px-2 text-[11px]"
                            >
                                {t('airspace.admin.map.clearVertices')}
                            </Button>
                        </>
                    )}
                    <MapLayerToolbar basemap={basemap} onBasemapChange={setBasemap} />
                </div>
            </CardHeader>
            <div ref={containerRef} className="h-[260px] w-full cursor-crosshair bg-slate-100" />
            <AirspaceDraftFooter draft={draft} onChange={onChange} />
        </Card>
    );
}
