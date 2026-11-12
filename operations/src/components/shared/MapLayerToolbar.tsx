'use client';

import React from 'react';
import {Compass, Layers, Radio} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {MAP_BASEMAP_ORDER} from '@/lib/map-config';
import {cn} from '@/lib/utils';
import type {Basemap} from '@/types';

interface MapLayerToolbarProps {
    basemap: Basemap;
    onBasemapChange: (next: Basemap) => void;
    onResetView?: () => void;
    showStationRadius?: boolean;
    onToggleStationRadius?: () => void;
    variant?: 'overlay' | 'inline';
    className?: string;
}

const control = 'inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-xs font-semibold transition-colors';

/** One compact strip: a basemap picker, the station-range toggle and "reset view". */
export function MapLayerToolbar({
    basemap,
    onBasemapChange,
    onResetView,
    showStationRadius,
    onToggleStationRadius,
    variant = 'inline',
    className,
}: MapLayerToolbarProps) {
    const {t} = useI18n();

    return (
        <div
            className={cn(
                'flex items-center gap-1.5 text-xs',
                variant === 'overlay' && 'absolute right-3 top-3 z-[400] rounded-overlay border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm',
                className,
            )}
            role="toolbar"
            aria-label={t('planner.basemap')}
        >
            <label className={cn(control, 'relative border-slate-200 bg-white pr-1 text-slate-700 hover:bg-slate-50')}>
                <Layers size={13} className="shrink-0 text-slate-500" aria-hidden="true"/>
                <span className="sr-only">{t('planner.basemap')}</span>
                <select
                    value={basemap}
                    onChange={event => onBasemapChange(event.target.value as Basemap)}
                    // Inside the portals the shared select style (globals.css) adds the chevron and its padding.
                    className="h-full cursor-pointer appearance-none bg-transparent pr-6 text-xs font-semibold text-slate-700 outline-none"
                >
                    {MAP_BASEMAP_ORDER.map(layer => <option key={layer} value={layer}>{t(`planner.basemaps.${layer}`)}</option>)}
                </select>
            </label>

            {onToggleStationRadius && (
                <button
                    type="button"
                    aria-pressed={!!showStationRadius}
                    onClick={onToggleStationRadius}
                    title={t('planner.controls.stationRadius')}
                    className={cn(control, showStationRadius
                        ? 'border-uav-blue bg-uav-blue-light text-uav-blue'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
                >
                    <Radio size={13} aria-hidden="true"/>
                    <span className="hidden sm:inline">{t('planner.controls.stationRadius')}</span>
                </button>
            )}

            {onResetView && (
                <button
                    type="button"
                    onClick={onResetView}
                    title={t('planner.controls.resetView')}
                    aria-label={t('planner.controls.resetView')}
                    className={cn(control, 'border-slate-200 bg-white px-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900')}
                >
                    <Compass size={14} aria-hidden="true"/>
                </button>
            )}
        </div>
    );
}
