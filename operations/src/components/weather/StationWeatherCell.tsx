'use client';

import {useI18n} from '@/providers/I18nContext';
import {ClearanceBadge} from '@/components/weather/PreflightWeatherCard';
import type {StationWeatherSummary} from '@/types/weather/weather.types';

/** Clearance, wind at 80 m and temperature at one ground station, for the stations table. */
export function StationWeatherCell({summary, loading}: { summary?: StationWeatherSummary; loading?: boolean }) {
    const {t, formatNumber} = useI18n();
    if (!summary) return <span className="text-xs text-muted">{loading ? t('common.loading') : '—'}</span>;
    const {assessment} = summary;
    const number = (value: number | null) => value == null ? '—' : formatNumber(value, {maximumFractionDigits: 1});
    return <span className="inline-flex flex-wrap items-center gap-2 text-xs text-muted">
        <ClearanceBadge clearance={assessment.clearance}/>
        {assessment.clearance !== 'UNAVAILABLE' && <span className="tabular-nums">
            {t('weather.preflight.stationSummary', {wind: number(assessment.windSpeed80mMs), temperature: number(assessment.temperatureC)})}</span>}
    </span>;
}
