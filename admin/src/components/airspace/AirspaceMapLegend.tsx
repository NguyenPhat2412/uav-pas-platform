'use client';

import React from 'react';
import {Badge, Input} from '@/components/ui';
import type {AirspaceZoneDraft} from '@/forms/airspace/airspace-zone-form';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';
import type {AirspaceZoneType} from '@/types/airspace/airspace.types';

const ZONE_LEGEND_SWATCH: Record<AirspaceZoneType, string> = {
    PROHIBITED: 'border-red-600 bg-red-500/20',
    RESTRICTED: 'border-amber-600 bg-amber-500/20',
    WARNING: 'border-slate-500 bg-slate-400/20',
};

const LEGEND_ZONE_TYPES: readonly AirspaceZoneType[] = ['PROHIBITED', 'RESTRICTED', 'WARNING'];

export function AirspaceMapLegend() {
    const {t} = useI18n();

    return (
        <div className="hidden items-center gap-2 md:flex">
            {LEGEND_ZONE_TYPES.map(zt => (
                <Badge
                    key={zt}
                    variant="outline"
                    size="sm"
                    className="bg-white font-medium normal-case tracking-normal text-slate-600"
                    icon={<span className={cn('h-2.5 w-2.5 rounded-sm border', ZONE_LEGEND_SWATCH[zt])} aria-hidden="true" />}
                >
                    {t(`airspace.zoneType.${zt}`)}
                </Badge>
            ))}
        </div>
    );
}

export function AirspaceDraftFooter({
    draft,
    onChange,
}: {
    draft: AirspaceZoneDraft;
    onChange: React.Dispatch<React.SetStateAction<AirspaceZoneDraft>>;
}) {
    const {t} = useI18n();
    const radiusSliderValue = Math.min(5000, Math.max(50, Number(draft.radiusMeters) || 1000));

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-slate-50/70 px-3 py-2 text-xs text-slate-600">
            <span>
                {draft.geometryType === 'CIRCLE'
                    ? t('airspace.admin.map.circleHint')
                    : t('airspace.admin.map.polygonHint')}
            </span>
            {draft.geometryType === 'CIRCLE' && (
                <div className="inline-flex items-center gap-2 font-semibold text-slate-700">
                    <div className="w-28">
                        <Input
                            type="range"
                            min={50}
                            max={5000}
                            step={50}
                            value={radiusSliderValue}
                            aria-label={t('airspace.admin.form.radiusMeters')}
                            onChange={e => onChange(prev => ({...prev, radiusMeters: e.target.value}))}
                            className="h-6 border-0 bg-transparent p-0 accent-slate-900 focus:outline-none"
                        />
                    </div>
                    <span className="w-14 text-right font-mono text-[11px] tabular-nums">
                        {draft.radiusMeters || 0} m
                    </span>
                </div>
            )}
        </div>
    );
}
