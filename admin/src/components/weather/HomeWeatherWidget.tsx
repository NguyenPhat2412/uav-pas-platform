'use client';

import Link from 'next/link';
import {useState, type ReactNode} from 'react';
import {AlertTriangle, ArrowUp, Ban, ChevronLeft, ChevronRight, Eye, HelpCircle, MapPin, PlaneTakeoff, Umbrella, Wind} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {useMapConfig} from '@/lib/map-config';
import {cn} from '@/lib/utils';
import {useForecastTimeline} from '@/hooks/weather/useWeather';
import {WeatherIcon} from '@/components/weather/WeatherIcon';
import {WeatherBackdrop} from '@/components/weather/WeatherBackdrop';
import {
    WEATHER_MAX_DAY_OFFSET,
    WEATHER_MIN_DAY_OFFSET,
    clampDayOffset,
    dateAtDayOffset,
    weatherTimelineForDay,
} from '@/utils/weather/flight-window';
import {CLEARANCE_TONE} from '@/utils/weather/clearance';
import {skyTheme} from '@/utils/weather/sky-theme';
import {conditionOf, isDaytime, rainLevel, visibilityLevel, windLevel, type Level} from '@/utils/weather/conditions';
import type {FlightClearanceLevel} from '@/types/weather/weather.types';

const QUICK_DAYS = [
    {offset: -1, key: 'yesterday'},
    {offset: 0, key: 'today'},
    {offset: 1, key: 'tomorrowDay'},
] as const;

// Verdict colours come from CLEARANCE_TONE so the home widget matches every other weather view.
const VERDICT: Record<FlightClearanceLevel, { icon: ReactNode; tone: string }> = {
    GO: {icon: <PlaneTakeoff size={15}/>, tone: CLEARANCE_TONE.GO},
    CAUTION: {icon: <AlertTriangle size={15}/>, tone: CLEARANCE_TONE.CAUTION},
    NO_GO: {icon: <Ban size={15}/>, tone: CLEARANCE_TONE.NO_GO},
    UNAVAILABLE: {icon: <HelpCircle size={15}/>, tone: CLEARANCE_TONE.UNAVAILABLE},
};
const LEVEL_TONE: Record<Level, string> = {good: 'text-slate-800', fair: 'text-amber-800', poor: 'text-danger'};
const LEVEL_TONE_DARK: Record<Level, string> = {good: 'text-white', fair: 'text-amber-200', poor: 'text-red-200'};

/** Icon plus one or two words; the caption (Gió, Mưa, Tầm nhìn) lives in the tooltip and accessible name. */
function Fact({icon, label, value, level, dark}: { icon: ReactNode; label: string; value: string; level: Level | null; dark: boolean }) {
    const tone = level ? (dark ? LEVEL_TONE_DARK : LEVEL_TONE)[level] : dark ? 'text-white/60' : 'text-slate-500';
    return <div className="flex min-w-0 items-center gap-2.5" title={label} aria-label={`${label}: ${value}`}>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-control backdrop-blur-sm',
            dark ? 'bg-white/15 text-white' : 'bg-white/65 text-slate-700')} aria-hidden="true">{icon}</span>
        <span aria-hidden="true" className={cn('truncate text-sm font-semibold', tone)}>{value}</span>
    </div>;
}

/**
 * Multi-day weather card for portal home pages: supports stepping -7..+14 days (Hôm trước / Hôm nay / Ngày mai)
 * and clicking any hour tile in the 4-slot strip to inspect take-off safety right from the dashboard.
 */
export function HomeWeatherWidget({detailsHref, className}: { detailsHref: string; className?: string }) {
    const {t, formatDate} = useI18n();
    const {config} = useMapConfig();
    const [baseDate] = useState(() => new Date());
    const [dayOffset, setDayOffset] = useState(0);
    const [selectedSlot, setSelectedSlot] = useState<string | undefined>(undefined);

    const times = weatherTimelineForDay(dayOffset, baseDate, selectedSlot);
    const point = {lat: Math.round(config.defaultCenter[0] * 1e4) / 1e4, lng: Math.round(config.defaultCenter[1] * 1e4) / 1e4};
    const results = useForecastTimeline(point, times);
    const headline = results[0];
    const data = headline.data;
    const hour = (value: string) => formatDate(value, {hour: '2-digit', minute: '2-digit'});
    const degrees = (value: number | null | undefined) => value == null ? '—' : `${Math.round(value)}°`;

    const wind = data ? windLevel(data.windSpeed80mMs ?? data.windSpeed10mMs, data.effectiveMaxWindMs) : null;
    const rain = data ? rainLevel(data.precipitationProbabilityPct, data.precipitationMm) : null;
    const sight = data ? visibilityLevel(data.visibilityMeters) : null;
    const verdict = data ? VERDICT[data.clearance] : null;
    const condition = data ? conditionOf(data.weatherCode) : 'unknown';
    const night = data ? !isDaytime(data.evaluatedTime) : false;
    const sky = data ? skyTheme(condition, night) : null;
    const dark = sky?.dark ?? false;

    const selectedDate = dateAtDayOffset(dayOffset, baseDate);
    const titleText = dayOffset === 0
        ? t('weather.home.title')
        : dayOffset === -1
            ? t('weather.home.titleYesterday')
            : dayOffset === 1
                ? t('weather.home.titleTomorrow')
                : t('weather.home.titleDate', {date: formatDate(selectedDate, {weekday: 'short', day: '2-digit', month: '2-digit'})});

    const pickDay = (next: number) => {
        setDayOffset(clampDayOffset(next));
        setSelectedSlot(undefined);
    };

    const navBtn = cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-control transition-colors disabled:opacity-35',
        dark ? 'text-white hover:bg-white/15' : 'text-slate-700 hover:bg-black/5',
    );

    return (
        <section className={cn('relative isolate overflow-hidden rounded-panel border transition-colors duration-700 motion-reduce:transition-none',
            sky ? cn(sky.background, dark ? 'border-white/10' : 'border-black/5') : 'border-border bg-card', className)} aria-labelledby="home-weather-title">
            {sky && <WeatherBackdrop effect={sky.effect} dark={dark} className="-z-10"/>}
            <div className={cn('flex flex-wrap items-center justify-between gap-2 border-b px-5 py-2.5', dark ? 'border-white/15' : sky ? 'border-black/5' : 'border-border')}>
                <h2 id="home-weather-title" className={cn('m-0 inline-flex items-center gap-2 text-sm font-bold', dark ? 'text-white' : 'text-slate-900')}>
                    {titleText}
                    <MapPin size={14} className={dark ? 'text-white/60' : 'text-slate-500'} aria-label={t('weather.workspace.presets.home')}>
                        <title>{t('weather.workspace.presets.home')}</title>
                    </MapPin>
                </h2>

                <div className="flex items-center gap-1.5">
                    <div role="group" aria-label={t('weather.workspace.day')}
                         className={cn('inline-flex items-center gap-0.5 rounded-control border p-0.5 backdrop-blur-xs',
                             dark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-white/65')}>
                        <button type="button" className={navBtn} disabled={dayOffset <= WEATHER_MIN_DAY_OFFSET}
                                onClick={() => pickDay(dayOffset - 1)} aria-label={t('weather.workspace.prevDay')} title={t('weather.workspace.prevDay')}>
                            <ChevronLeft size={15}/>
                        </button>
                        {QUICK_DAYS.map(item => {
                            const active = dayOffset === item.offset;
                            return (
                                <button key={item.key} type="button" aria-pressed={active} onClick={() => pickDay(item.offset)}
                                        className={cn('rounded-control px-2 py-1 text-xs font-semibold transition-colors',
                                            active
                                                ? dark ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-900 text-white shadow-xs'
                                                : dark ? 'text-white/80 hover:bg-white/10' : 'text-slate-600 hover:bg-black/5')}>
                                    {t(`weather.workspace.${item.key}`)}
                                </button>
                            );
                        })}
                        <button type="button" className={navBtn} disabled={dayOffset >= WEATHER_MAX_DAY_OFFSET}
                                onClick={() => pickDay(dayOffset + 1)} aria-label={t('weather.workspace.nextDay')} title={t('weather.workspace.nextDay')}>
                            <ChevronRight size={15}/>
                        </button>
                    </div>

                    <Link href={detailsHref} aria-label={t('weather.home.details')} title={t('weather.home.details')}
                          className={cn('inline-flex h-8 w-8 items-center justify-center rounded-control transition-colors',
                              dark ? 'text-white hover:bg-white/10' : 'text-primary hover:bg-black/5')}>
                        <ChevronRight size={18}/>
                    </Link>
                </div>
            </div>

            {headline.isPending ? (
                <div className="flex items-center gap-4 p-5" role="status" aria-label={t('common.loading')}>
                    <span className="h-16 w-16 animate-pulse rounded-panel bg-slate-100"/>
                    <span className="h-5 w-40 animate-pulse rounded bg-slate-100"/>
                </div>
            ) : !data ? (
                <p role="alert" className="m-0 p-5 text-sm text-slate-500">{t('weather.preflight.loadError')}</p>
            ) : (
                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center">
                    <div className="flex items-center gap-4">
                        <WeatherIcon condition={condition} night={night} onDark={dark} size={64} className="drop-shadow-sm"/>
                        <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className={cn('text-4xl font-extrabold leading-none tracking-tight', dark ? 'text-white' : 'text-slate-900')}>{degrees(data.temperatureC)}</span>
                                <span className={cn('text-sm font-semibold', dark ? 'text-white/80' : 'text-slate-700')}>{t(night && (condition === 'clear' || condition === 'partly') ? `weather.home.conditionsNight.${condition}` : `weather.home.conditions.${condition}`)}</span>
                            </div>
                            {verdict && (
                                <span className={cn('mt-2 inline-flex items-center gap-1.5 rounded-badge border px-2.5 py-1 text-xs font-bold', verdict.tone)}>
                                    {verdict.icon}{t(`weather.home.verdict.${data.clearance}`)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                        <Fact dark={dark} label={t('weather.home.wind')} level={wind}
                              value={wind ? t(`weather.home.levels.wind.${wind}`) : '—'}
                              icon={data.windDirectionDeg == null ? <Wind size={17}/>
                                  : <ArrowUp size={17} style={{transform: `rotate(${(data.windDirectionDeg + 180) % 360}deg)`}}/>}/>
                        <Fact dark={dark} label={t('weather.home.rain')} level={rain} icon={<Umbrella size={17}/>}
                              value={rain ? t(`weather.home.levels.rain.${rain}`) : '—'}/>
                        <Fact dark={dark} label={t('weather.home.visibility')} level={sight} icon={<Eye size={17}/>}
                              value={sight ? t(`weather.home.levels.visibility.${sight}`) : '—'}/>
                    </div>

                    <ol className="m-0 grid grid-cols-4 gap-2 p-0" aria-label={t(dayOffset === 0 ? 'weather.home.next' : 'weather.home.daySlots')}>
                        {results.slice(1).map((slot, index) => {
                            const slotIso = times[index + 1]!;
                            const a = slot.data;
                            const activeSlot = selectedSlot === slotIso;
                            const tile = a ? skyTheme(conditionOf(a.weatherCode), !isDaytime(a.evaluatedTime)) : null;
                            return (
                                <li key={slotIso} className="list-none">
                                    <button type="button" aria-pressed={activeSlot}
                                            onClick={() => setSelectedSlot(prev => prev === slotIso ? undefined : slotIso)}
                                            className={cn('flex w-full flex-col items-center gap-1.5 rounded-control border px-1 py-3 text-center shadow-xs transition-all',
                                                tile ? cn(tile.background, tile.dark ? 'border-white/10' : 'border-white/60') : 'border-transparent bg-white/60',
                                                activeSlot && 'ring-2 ring-primary')}>
                                        <span className={cn('text-[11px] font-semibold', tile?.dark ? 'text-white/75' : 'text-slate-600')}>{hour(slotIso)}</span>
                                        {a ? <WeatherIcon condition={conditionOf(a.weatherCode)} night={!isDaytime(a.evaluatedTime)} onDark={tile?.dark} size={26} animated={false}/>
                                            : <span className="h-[26px] w-[26px] animate-pulse rounded-control bg-slate-200"/>}
                                        <span className={cn('text-sm font-bold', tile?.dark ? 'text-white' : 'text-slate-900')}>{degrees(a?.temperatureC)}</span>
                                        {a && <span className={cn('flex h-5 w-5 items-center justify-center rounded-badge border [&>svg]:h-3 [&>svg]:w-3', VERDICT[a.clearance].tone)}
                                                    title={t(`weather.home.verdict.${a.clearance}`)}>{VERDICT[a.clearance].icon}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}
        </section>
    );
}
