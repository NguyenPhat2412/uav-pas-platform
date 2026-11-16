'use client';

import {useState, type ReactNode} from 'react';
import {CalendarDays, ChevronLeft, ChevronRight, Clock3, LocateFixed, MapPin, RadioTower} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useMapConfig} from '@/lib/map-config';
import {cn} from '@/lib/utils';
import {useForecastAssessment, useForecastMany, useStationsWeather} from '@/hooks/weather/useWeather';
import {PreflightWeatherCard} from '@/components/weather/PreflightWeatherCard';
import {WeatherIcon} from '@/components/weather/WeatherIcon';
import {WeatherPointMap, type WeatherMapPlace} from '@/components/weather/WeatherPointMap';
import {
    WEATHER_DAY_OFFSETS, WEATHER_HOUR_SLOTS, WEATHER_MAX_DAY_OFFSET, WEATHER_MIN_DAY_OFFSET,
    buildWeatherSlotIso, clampDayOffset, dateAtDayOffset, dayOffsetFromIso, hourFromIso, localDateIso,
} from '@/utils/weather/flight-window';
import {conditionOf, isDaytime} from '@/utils/weather/conditions';
import type {WeatherAssessment} from '@/types/weather/weather.types';

const PRESETS = [
    {key: 'home', lat: 0, lng: 0}, {key: 'hanoi', lat: 21.0285, lng: 105.8048},
    {key: 'halong', lat: 20.9517, lng: 107.08}, {key: 'danang', lat: 16.0544, lng: 108.2022},
    {key: 'hcmc', lat: 10.7769, lng: 106.7009},
] as const;

type HourChoice = 'now' | typeof WEATHER_HOUR_SLOTS[number] | 'custom';

const round = (value: number) => Math.round(value * 1e4) / 1e4;
const samePoint = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => round(a.lat) === round(b.lat) && round(a.lng) === round(b.lng);
const row = (active: boolean) => cn(
    'flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-sm transition-colors',
    active ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50',
);
const chip = (active: boolean) => cn(
    'inline-flex h-8 items-center justify-center rounded-control border px-2.5 text-xs font-semibold transition-colors',
    active ? 'border-primary bg-sky-50 text-uav-blue' : 'border-border bg-white text-slate-600 hover:bg-slate-50',
);

function SkyIcon({data, size}: { data?: WeatherAssessment; size: number }) {
    return data ? <WeatherIcon condition={conditionOf(data.weatherCode)} night={!isDaytime(data.evaluatedTime)} size={size} animated={false}/>
        : <span style={{width: size, height: size}} className="shrink-0 animate-pulse rounded-control bg-slate-100"/>;
}

function FilterGroup({icon, title, children}: { icon: ReactNode; title: string; children: ReactNode }) {
    return <div role="group" aria-label={title} className="space-y-1">
        <p className="m-0 flex items-center gap-1.5 px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{icon}{title}</p>
        {children}
    </div>;
}

/**
 * Shared "Flight weather" workspace across all three portals: supports multi-day navigation from -7 past days
 * through +14 forecast days (Hôm trước / Hôm qua / Hôm nay / Ngày mai / Hôm sau + 22-day strip + hour slots).
 */
export function FlightWeatherWorkspace({showStations = false}: { showStations?: boolean }) {
    const {t, formatDate} = useI18n();
    const {can, permissionsReady} = useAuth();
    const {config} = useMapConfig();
    const [baseDate] = useState(() => new Date());
    const [point, setPoint] = useState<{ lat: number; lng: number; label: string } | null>(null);
    const [dayOffset, setDayOffset] = useState(0);
    const [hourChoice, setHourChoice] = useState<HourChoice>('now');
    const [customAt, setCustomAt] = useState<string>('');
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<string | null>(null);

    const selectedDate = dateAtDayOffset(dayOffset, baseDate);
    const selectedDateIso = localDateIso(selectedDate);
    const minDateIso = localDateIso(dateAtDayOffset(WEATHER_MIN_DAY_OFFSET, baseDate));
    const maxDateIso = localDateIso(dateAtDayOffset(WEATHER_MAX_DAY_OFFSET, baseDate));

    const at: string | undefined = hourChoice === 'now'
        ? (dayOffset === 0 ? undefined : buildWeatherSlotIso(dayOffset, 9, baseDate))
        : hourChoice === 'custom'
            ? (customAt || buildWeatherSlotIso(dayOffset, 9, baseDate))
            : buildWeatherSlotIso(dayOffset, hourChoice, baseDate);

    const stationsAllowed = showStations && permissionsReady && can('STATION_VIEW');
    const stations = useStationsWeather(stationsAllowed);
    const presetPlaces = PRESETS.map(preset => preset.key === 'home'
        ? {key: 'home', lat: config.defaultCenter[0], lng: config.defaultCenter[1], label: t('weather.workspace.presets.home')}
        : {key: preset.key, lat: preset.lat, lng: preset.lng, label: t(`weather.workspace.presets.${preset.key}`)});
    const stationPlaces = (stationsAllowed ? stations.data ?? [] : [])
        .map(s => ({key: `station-${s.stationId}`, lat: s.latitude, lng: s.longitude, label: `${s.code} · ${s.name}`}));
    const allPlaces = [...presetPlaces, ...stationPlaces];
    const forecasts = useForecastMany(allPlaces.map(place => ({lat: round(place.lat), lng: round(place.lng), at})));
    const dataOf = (index: number) => forecasts[index]?.data;

    const current = point ?? presetPlaces[0];
    const assessment = useForecastAssessment({lat: round(current.lat), lng: round(current.lng), at});

    const mapPlaces: WeatherMapPlace[] = allPlaces.map((place, index) => {
        const data = dataOf(index);
        const selected = samePoint(place, current);
        return {
            ...place,
            node: <span className={cn('flex flex-col items-center rounded-control border bg-white/95 px-2 py-1 shadow-md',
                selected ? 'border-primary ring-2 ring-primary/30' : 'border-white')}>
                <SkyIcon data={data} size={26}/>
                <span className="text-xs font-bold tabular-nums text-slate-800">{data?.temperatureC == null ? '—' : `${Math.round(data.temperatureC)}°`}</span>
            </span>,
        };
    });

    const selectDay = (next: number, resetToLive = false) => {
        const safe = clampDayOffset(next);
        setDayOffset(safe);
        if (resetToLive && safe === 0) {
            setHourChoice('now');
            return;
        }
        if (hourChoice === 'now' && safe !== 0) {
            setHourChoice(10);
        } else if (hourChoice === 'custom') {
            const timePart = customAt.length >= 16 ? customAt.slice(11, 16) : '09:00';
            setCustomAt(`${localDateIso(dateAtDayOffset(safe, baseDate))}T${timePart}`);
        }
    };

    const relativeDayLabel = (offset: number) => {
        if (offset === 0) return t('weather.workspace.today');
        if (offset === -1) return t('weather.workspace.yesterday');
        if (offset === 1) return t('weather.workspace.tomorrowDay');
        return offset < 0
            ? t('weather.workspace.dayOffsetPast', {days: Math.abs(offset)})
            : t('weather.workspace.dayOffsetFuture', {days: offset});
    };

    const locate = () => {
        if (!navigator.geolocation) {
            setLocateError(t('weather.workspace.locateUnsupported'));
            return;
        }
        setLocating(true);
        setLocateError(null);
        navigator.geolocation.getCurrentPosition(
            position => {
                setLocating(false);
                setPoint({lat: position.coords.latitude, lng: position.coords.longitude, label: t('weather.workspace.myLocation')});
            },
            () => {
                setLocating(false);
                setLocateError(t('weather.workspace.locateDenied'));
            },
            {enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000},
        );
    };

    const placeRow = (place: { key: string; lat: number; lng: number; label: string }, index: number) => {
        const data = dataOf(index);
        const active = samePoint(place, current);
        return <button key={place.key} type="button" aria-pressed={active} className={row(active)} onClick={() => setPoint(place)}>
            <SkyIcon data={data} size={20}/>
            <span className="min-w-0 flex-1 truncate">{place.label}</span>
            <span className="text-xs font-semibold tabular-nums text-slate-500">{data?.temperatureC == null ? '' : `${Math.round(data.temperatureC)}°`}</span>
        </button>;
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] 2xl:grid-cols-[15rem_minmax(0,1fr)_26rem]">
            <section className="col-span-full space-y-2.5 rounded-panel border border-border bg-card p-3" aria-label={t('weather.workspace.day')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button type="button" disabled={dayOffset <= WEATHER_MIN_DAY_OFFSET} onClick={() => selectDay(dayOffset - 1)}
                                className="inline-flex h-8 items-center gap-1 rounded-control border border-border bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                            <ChevronLeft size={14}/>{t('weather.workspace.prevDay')}
                        </button>
                        <span className="inline-flex h-8 items-center gap-1.5 rounded-control border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-uav-blue">
                            <CalendarDays size={14}/>
                            {relativeDayLabel(dayOffset)} · {formatDate(selectedDate, {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'})}
                        </span>
                        <button type="button" disabled={dayOffset >= WEATHER_MAX_DAY_OFFSET} onClick={() => selectDay(dayOffset + 1)}
                                className="inline-flex h-8 items-center gap-1 rounded-control border border-border bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                            {t('weather.workspace.nextDay')}<ChevronRight size={14}/>
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <button type="button" aria-pressed={dayOffset === -1} className={chip(dayOffset === -1)} onClick={() => selectDay(-1)}>
                            {t('weather.workspace.yesterday')}
                        </button>
                        <button type="button" aria-pressed={dayOffset === 0 && hourChoice === 'now'} className={chip(dayOffset === 0)}
                                onClick={() => selectDay(0, true)}>
                            {t('weather.workspace.today')}
                        </button>
                        <button type="button" aria-pressed={dayOffset === 1} className={chip(dayOffset === 1)} onClick={() => selectDay(1)}>
                            {t('weather.workspace.tomorrowDay')}
                        </button>
                        <input type="date" aria-label={t('weather.workspace.pickDate')} min={minDateIso} max={maxDateIso} value={selectedDateIso}
                               onChange={event => event.target.value && selectDay(dayOffsetFromIso(event.target.value, baseDate))}
                               className="h-8 rounded-control border border-border bg-white px-2 text-xs font-medium text-slate-700"/>
                        <span className="hidden text-[11px] text-muted xl:inline">{t('weather.workspace.rangeHint')}</span>
                    </div>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label={t('weather.workspace.rangeHint')}>
                    {WEATHER_DAY_OFFSETS.map(offset => {
                        const day = dateAtDayOffset(offset, baseDate);
                        const active = offset === dayOffset;
                        const isToday = offset === 0;
                        return (
                            <button key={offset} type="button" aria-pressed={active} onClick={() => selectDay(offset)}
                                    className={cn('flex min-w-[3.6rem] shrink-0 flex-col items-center rounded-control border px-2 py-1 text-center transition-colors',
                                        active
                                            ? 'border-primary bg-sky-50 font-bold text-uav-blue'
                                            : isToday
                                                ? 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
                                                : 'border-border bg-white text-slate-600 hover:bg-slate-50')}>
                                <span className="text-[10px] uppercase tracking-tight opacity-80">
                                    {offset === -1 ? t('weather.workspace.yesterday') : offset === 0 ? t('weather.workspace.today') : offset === 1 ? t('weather.workspace.tomorrowDay') : formatDate(day, {weekday: 'short'})}
                                </span>
                                <span className="text-xs font-semibold tabular-nums">{formatDate(day, {day: '2-digit', month: '2-digit'})}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2" role="group" aria-label={t('weather.workspace.hour')}>
                    <span className="inline-flex items-center gap-1 pr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <Clock3 size={12}/>{t('weather.workspace.hour')}
                    </span>
                    <button type="button" aria-pressed={dayOffset === 0 && hourChoice === 'now'} className={chip(dayOffset === 0 && hourChoice === 'now')}
                            onClick={() => { setDayOffset(0); setHourChoice('now'); }}>
                        {t('weather.workspace.times.now')}
                    </button>
                    {WEATHER_HOUR_SLOTS.map(slot => (
                        <button key={slot} type="button" aria-pressed={hourChoice === slot} className={chip(hourChoice === slot)}
                                onClick={() => setHourChoice(slot)}>
                            {`${String(slot).padStart(2, '0')}:00`}
                        </button>
                    ))}
                    <button type="button" aria-pressed={hourChoice === 'custom'} className={chip(hourChoice === 'custom')}
                            onClick={() => {
                                setHourChoice('custom');
                                setCustomAt(prev => prev || buildWeatherSlotIso(dayOffset, hourFromIso(at) ?? 9, baseDate));
                            }}>
                        {t('weather.workspace.times.custom')}
                    </button>
                    {hourChoice === 'custom' && (
                        <input type="datetime-local" aria-label={t('weather.workspace.times.custom')}
                               min={`${minDateIso}T00:00`} max={`${maxDateIso}T23:00`} value={customAt}
                               onChange={event => {
                                   const next = event.target.value;
                                   setCustomAt(next);
                                   if (next) setDayOffset(dayOffsetFromIso(next, baseDate));
                               }}
                               className="h-8 rounded-control border border-border bg-white px-2 text-xs text-slate-800"/>
                    )}
                </div>
            </section>

            <aside className="space-y-4 rounded-panel border border-border bg-card p-2.5 lg:row-span-2 2xl:row-span-1" aria-label={t('weather.workspace.filters')}>
                <FilterGroup icon={<MapPin size={12}/>} title={t('weather.workspace.place')}>
                    {presetPlaces.map(placeRow)}
                    <button type="button" className={row(current.label === t('weather.workspace.myLocation'))} onClick={locate} disabled={locating}>
                        <LocateFixed size={18} className="shrink-0 text-slate-400"/>
                        <span className="truncate">{locating ? t('common.loading') : t('weather.workspace.myLocation')}</span>
                    </button>
                    {locateError && <p role="alert" className="m-0 px-2.5 text-xs text-danger">{locateError}</p>}
                </FilterGroup>
                {stationPlaces.length > 0 && (
                    <FilterGroup icon={<RadioTower size={12}/>} title={t('weather.workspace.stations')}>
                        {stationPlaces.map((place, index) => placeRow(place, presetPlaces.length + index))}
                    </FilterGroup>
                )}
            </aside>

            <section className="min-w-0 overflow-hidden rounded-panel border border-border bg-card" aria-label={t('weather.workspace.map')}>
                <WeatherPointMap className="h-[420px] w-full sm:h-[560px]" point={current} places={mapPlaces}
                                 onPick={(lat, lng, label) => setPoint({lat, lng, label: label ?? t('weather.workspace.pickedPoint')})}/>
                <p className="m-0 flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs text-slate-500">
                    <MapPin size={13} className="text-primary"/><strong className="font-semibold text-slate-800">{current.label}</strong>
                </p>
            </section>

            <PreflightWeatherCard className="min-w-0" assessment={assessment.data} isPending={assessment.isPending} isError={assessment.isError}
                                  onSelectWindow={start => {
                                      const nextOffset = dayOffsetFromIso(start, baseDate);
                                      const parsedHour = hourFromIso(start);
                                      const slotMatch = WEATHER_HOUR_SLOTS.find(s => s === parsedHour && start.endsWith(':00'));
                                      setDayOffset(nextOffset);
                                      if (slotMatch) {
                                          setHourChoice(slotMatch);
                                      } else {
                                          setHourChoice('custom');
                                          setCustomAt(start.slice(0, 16));
                                      }
                                  }}/>
        </div>
    );
}
