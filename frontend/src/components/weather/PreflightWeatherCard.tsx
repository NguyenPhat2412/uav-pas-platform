'use client';

import {useId, type ReactNode} from 'react';
import {BatteryMedium, Clock3, CloudSun, Compass, Droplets, Eye, Gauge, Magnet, Thermometer, Wind} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import {CLEARANCE_TONE, compassPoint} from '@/utils/weather/clearance';
import type {FlightClearanceLevel, WeatherAssessment} from '@/types/weather/weather.types';

interface PreflightWeatherCardProps {
    assessment?: WeatherAssessment | null;
    isPending?: boolean;
    isError?: boolean;
    /** Shown when no location is known yet (e.g. before a point is picked on the map). */
    emptyMessage?: string;
    /** When given, each recommended window gets a button that applies its start time (local ISO). */
    onSelectWindow?: (startTime: string) => void;
    className?: string;
}

export function ClearanceBadge({clearance, className}: { clearance: FlightClearanceLevel; className?: string }) {
    const {t} = useI18n();
    return <span className={cn('inline-flex items-center whitespace-nowrap rounded-badge border px-2 py-0.5 text-xs font-bold', CLEARANCE_TONE[clearance], className)}>
        {t(`weather.preflight.clearance.${clearance}`)}</span>;
}

/**
 * Take-off weather for UAV crews and customers: verdict and score, wind at ground and flight level
 * against the limit, gusts, visibility, rain, geomagnetic Kp, expected battery drain, the reasons
 * behind the verdict and the best daytime windows.
 */
export function PreflightWeatherCard({assessment, isPending, isError, emptyMessage, onSelectWindow, className}: PreflightWeatherCardProps) {
    const {t, formatNumber, formatDate} = useI18n();
    const number = (value: number | null | undefined, digits = 1) =>
        value == null ? '—' : formatNumber(value, {maximumFractionDigits: digits});
    const time = (value: string) => formatDate(value, {dateStyle: 'short', timeStyle: 'short'});
    const data = assessment ?? null;
    const titleId = useId();

    return <section className={cn('min-w-0 overflow-hidden rounded-panel border border-border bg-card', className)} aria-labelledby={titleId}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 id={titleId} className="m-0 inline-flex items-center gap-2 text-base font-bold text-foreground">
                <CloudSun size={18} aria-hidden="true"/>{t('weather.preflight.title')}</h2>
            {data && <div className="flex items-center gap-2">
                <ClearanceBadge clearance={data.clearance}/>
                {data.clearance !== 'UNAVAILABLE' && <span className="text-xs font-semibold tabular-nums text-muted">
                    {t('weather.preflight.score', {score: data.safetyScore})}</span>}
            </div>}
        </header>
        <div className="grid gap-4 px-5 py-4">
            {!data ? <p className="m-0 text-sm text-muted" role="status">
                    {isPending ? t('common.loading') : isError ? t('weather.preflight.loadError') : emptyMessage ?? t('weather.preflight.noLocation')}</p>
                : <>
                    <p className="m-0 text-xs text-muted">
                        {t(data.forecast ? 'weather.preflight.forecastAt' : 'weather.preflight.currentAt', {time: time(data.evaluatedTime)})}
                        {' · '}{t(`weather.preflight.provider.${data.provider}`)}
                        {data.fromCache && <> · {t('weather.preflight.cached')}</>}
                    </p>
                    {data.clearance === 'UNAVAILABLE'
                        ? <p className="m-0 text-sm text-slate-600">{data.reasonCodes.map(code => t(`weather.preflight.reasons.${code}`)).join(' ')}</p>
                        : <>
                            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                                <Metric icon={<Wind size={15}/>} label={t('weather.preflight.wind10m')} value={`${number(data.windSpeed10mMs)} m/s`}/>
                                <Metric icon={<Gauge size={15}/>} label={t('weather.preflight.windFlight')}
                                        value={`${number(data.windSpeed80mMs)} / ${number(data.windSpeed120mMs)} m/s`}
                                        hint={t('weather.preflight.limit', {limit: number(data.effectiveMaxWindMs)})}
                                        warn={(data.windSpeed80mMs ?? 0) > data.effectiveMaxWindMs}/>
                                <Metric icon={<Wind size={15}/>} label={t('weather.preflight.gusts')} value={`${number(data.windGustsMs)} m/s`}/>
                                <Metric icon={<Compass size={15}/>} label={t('weather.preflight.direction')}
                                        value={data.windDirectionDeg == null ? '—' : `${compassPoint(data.windDirectionDeg)} · ${number(data.windDirectionDeg, 0)}°`}/>
                                <Metric icon={<Eye size={15}/>} label={t('weather.preflight.visibility')}
                                        value={data.visibilityMeters == null ? '—' : `${number(data.visibilityMeters / 1000)} km`}/>
                                <Metric icon={<Droplets size={15}/>} label={t('weather.preflight.rain')}
                                        value={`${number(data.precipitationMm)} mm · ${number(data.precipitationProbabilityPct, 0)}%`}/>
                                <Metric icon={<Thermometer size={15}/>} label={t('weather.preflight.temperature')}
                                        value={`${number(data.temperatureC)}°C · ${number(data.humidityPct, 0)}%`}/>
                                <Metric icon={<Magnet size={15}/>} label={t('weather.preflight.kp')} value={number(data.kpIndex)}/>
                                <Metric icon={<BatteryMedium size={15}/>} label={t('weather.preflight.battery')}
                                        value={`×${formatNumber(data.batteryDrainMultiplier, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                                        hint={t('weather.preflight.batteryHint')}/>
                            </dl>
                            {data.reasonCodes.length > 0 && <ul className="m-0 grid list-none gap-1.5 p-0" aria-label={t('weather.preflight.reasonsLabel')}>
                                {data.reasonCodes.map(code => <li key={code}
                                    className={cn('rounded-panel px-3 py-2 text-[13px] font-medium',
                                        CLEARANCE_TONE[NO_GO_REASONS.has(code) ? 'NO_GO' : 'CAUTION'].replace(/border-\S+/, ''))}>
                                    {t(`weather.preflight.reasons.${code}`)}</li>)}
                            </ul>}
                            <div className="grid gap-2">
                                <h3 className="m-0 inline-flex items-center gap-1.5 text-[13px] font-bold text-foreground">
                                    <Clock3 size={15} aria-hidden="true"/>{t('weather.preflight.windows')}</h3>
                                {data.recommendedWindows.length === 0
                                    ? <p className="m-0 text-xs text-muted">{t('weather.preflight.noWindows')}</p>
                                    : <ul className="m-0 grid list-none gap-0 divide-y divide-border p-0">
                                        {data.recommendedWindows.map(window => <li key={window.startTime} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                            <span className="text-sm font-semibold tabular-nums text-foreground">{time(window.startTime)}</span>
                                            <span className="flex items-center gap-2 text-xs text-muted">
                                                <ClearanceBadge clearance={window.clearance}/>
                                                <span className="tabular-nums">{t('weather.preflight.windowWind', {wind: number(window.windSpeed80mMs)})}</span>
                                                <span className="tabular-nums">{t('weather.preflight.score', {score: window.safetyScore})}</span>
                                                {onSelectWindow && <button type="button" onClick={() => onSelectWindow(window.startTime)}
                                                    className="rounded-control px-2 py-1 text-xs font-bold text-uav-blue hover:bg-sky-50">
                                                    {t('weather.preflight.useWindow')}</button>}
                                            </span>
                                        </li>)}
                                    </ul>}
                            </div>
                        </>}
                    <p className="m-0 text-xs leading-relaxed text-muted">{t('weather.preflight.disclaimer')}</p>
                </>}
        </div>
    </section>;
}

const NO_GO_REASONS = new Set(['WIND_LIMIT_EXCEEDED', 'WIND_GUST_EXCEEDED', 'PRECIPITATION_UNSAFE', 'VISIBILITY_TOO_LOW', 'GEOMAGNETIC_STORM']);

function Metric({icon, label, value, hint, warn}: { icon: ReactNode; label: string; value: string; hint?: string; warn?: boolean }) {
    return <div className="grid min-w-0 gap-0.5">
        <dt className="inline-flex items-center gap-1.5 text-xs text-muted"><span aria-hidden="true">{icon}</span>{label}</dt>
        <dd className={cn('m-0 text-sm font-semibold tabular-nums', warn ? 'text-danger' : 'text-foreground')}>{value}</dd>
        {hint && <dd className="m-0 text-[11px] text-muted">{hint}</dd>}
    </div>;
}
