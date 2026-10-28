'use client';

import React from 'react';
import {Compass, Layers, Radio} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
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
                'flex flex-wrap items-center gap-1.5 text-xs',
                variant === 'overlay' && 'absolute right-3 top-3 z-[400] border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm',
                className,
            )}
            role="toolbar"
            aria-label={t('planner.basemap')}
        >
            <div className="inline-flex items-center border border-slate-200 bg-white" role="radiogroup" aria-label={t('planner.basemap')}>
                <span className="hidden items-center gap-1 border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 sm:inline-flex">
                    <Layers size={12} aria-hidden="true"/>
                    {t('planner.basemap')}
                </span>
                {MAP_BASEMAP_ORDER.map(layer => {
                    const active = basemap === layer;
                    return (
                        <button
                            key={layer}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onBasemapChange(layer)}
                            className={cn(
                                'px-2.5 py-1.5 text-xs font-semibold transition-colors',
                                active ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                            )}
                        >
                            {t(`planner.basemaps.${layer}`)}
                        </button>
                    );
                })}
            </div>

            {onToggleStationRadius && (
                <button
                    type="button"
                    aria-pressed={!!showStationRadius}
                    onClick={onToggleStationRadius}
                    className={cn(
                        'inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                        showStationRadius
                            ? 'border-uav-blue bg-uav-blue-light text-uav-blue'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                >
                    <Radio size={13} aria-hidden="true"/>
                    <span>{t('map.controls.stationRadius')}</span>
                </button>
            )}

            {onResetView && (
                <button
                    type="button"
                    onClick={onResetView}
                    title={t('map.controls.resetView')}
                    className="inline-flex items-center gap-1 border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                    <Compass size={13} aria-hidden="true"/>
                    <span className="hidden sm:inline">{t('map.controls.resetView')}</span>
                </button>
            )}
        </div>
    );
}
