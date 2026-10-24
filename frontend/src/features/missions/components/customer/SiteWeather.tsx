'use client';
import type {ReactNode} from 'react';
import {useQuery} from '@tanstack/react-query';
import {CloudSun, Compass, Droplets, Eye, Thermometer, Wind} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {fetchKpIndex, fetchSiteWeather} from '@/lib/external/weather';
import type {Mission} from '@/types/customer';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** Reference conditions at the mission site; flight clearance remains the operations team's decision. */
export function SiteWeather({mission}: { mission: Mission }) {
    const {t, formatNumber, formatDate} = useI18n();
    const hasPoint = mission.latitude != null && mission.longitude != null;
    const weather = useQuery({
        queryKey: ['site-weather', mission.latitude, mission.longitude, mission.startTime?.slice(0, 13)],
        queryFn: ({signal}) => fetchSiteWeather(mission.latitude!, mission.longitude!, mission.startTime, signal),
        enabled: hasPoint,
        staleTime: 30 * 60_000,
        retry: 1,
    });
    const kp = useQuery({
        queryKey: ['kp-index'],
        queryFn: ({signal}) => fetchKpIndex(signal),
        enabled: hasPoint,
        staleTime: 60 * 60_000,
        retry: 1,
    });
    const number = (value: number | undefined, digits = 1) => value == null ? '—' : formatNumber(value, {maximumFractionDigits: digits});
    const data = weather.data;

    return <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                    aria-labelledby="weather-title">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-6 md:py-5">
            <h2 id="weather-title" className="m-0 inline-flex items-center gap-2 text-lg font-bold text-foreground">
                <CloudSun size={20} aria-hidden="true"/>{t('weather.title')}</h2>
            <span className="rounded-lg bg-background px-2.5 py-1 text-xs font-semibold text-muted">{t('weather.reference')}</span>
        </header>
        <div className="grid gap-3 p-5 md:p-6">
            {!hasPoint ? <p className="m-0 text-sm text-muted">{t('weather.noLocation')}</p>
                : weather.isPending ? <p className="m-0 text-sm text-muted" role="status">{t('common.loading')}</p>
                    : weather.isError || !data ? <p className="m-0 text-sm text-muted" role="status">{t('weather.unavailable')}</p>
                        : <>
                            <p className="m-0 text-xs text-muted">{t(data.forecast ? 'weather.forecastAt' : 'weather.currentAt', {time: formatDate(data.time)})}</p>
                            <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-3">
                                <Metric icon={<Wind size={16}/>} label={t('weather.wind')}
                                        value={t('weather.windValue', {speed: number(data.windSpeed), gusts: number(data.windGusts)})}/>
                                <Metric icon={<Compass size={16}/>} label={t('weather.direction')}
                                        value={data.windDirection == null ? '—' : `${COMPASS[Math.round(data.windDirection / 45) % 8]} · ${number(data.windDirection, 0)}°`}/>
                                <Metric icon={<Eye size={16}/>} label={t('weather.visibility')}
                                        value={data.visibility == null ? '—' : t('weather.km', {value: number(data.visibility / 1000)})}/>
                                <Metric icon={<Droplets size={16}/>} label={t('weather.humidity')}
                                        value={data.humidity == null ? '—' : `${number(data.humidity, 0)}%`}/>
                                <Metric icon={<Thermometer size={16}/>} label={t('weather.temperature')}
                                        value={data.temperature == null ? '—' : `${number(data.temperature)}°C`}/>
                                <Metric icon={<CloudSun size={16}/>} label={t('weather.rain')}
                                        value={data.precipitationProbability == null ? '—' : `${number(data.precipitationProbability, 0)}%`}/>
                            </dl>
                        </>}
            {hasPoint && <p className="m-0 text-xs text-muted">
                {t('weather.kp')}: <strong className="text-foreground">{kp.data ? number(kp.data.kp) : '—'}</strong>
                {kp.data && kp.data.kp >= 5 && <span className="ml-2 font-semibold text-danger">{t('weather.kpStorm')}</span>}
            </p>}
            <p className="m-0 text-xs leading-relaxed text-muted">{t('weather.disclaimer')}</p>
        </div>
    </section>;
}

function Metric({icon, label, value}: { icon: ReactNode; label: string; value: string }) {
    return <div className="grid gap-1 rounded-xl border border-border p-3">
        <dt className="inline-flex items-center gap-1.5 text-xs text-muted"><span aria-hidden="true">{icon}</span>{label}</dt>
        <dd className="m-0 text-sm font-semibold tabular-nums text-foreground">{value}</dd>
    </div>;
}
