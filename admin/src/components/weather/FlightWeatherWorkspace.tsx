'use client';

import {useState, type ReactNode} from 'react';
import {Clock3, LocateFixed, MapPin, RadioTower} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useMapConfig} from '@/lib/map-config';
import {cn} from '@/lib/utils';
import {useForecastAssessment, useForecastMany, useStationsWeather} from '@/hooks/weather/useWeather';
import {PreflightWeatherCard} from '@/components/weather/PreflightWeatherCard';
import {WeatherIcon} from '@/components/weather/WeatherIcon';
import {WeatherPointMap, type WeatherMapPlace} from '@/components/weather/WeatherPointMap';
import {localIso} from '@/utils/weather/flight-window';
import {conditionOf, isDaytime} from '@/utils/weather/conditions';
import type {WeatherAssessment} from '@/types/weather/weather.types';

// Common flying areas; "home" is replaced by the platform's configured map centre.
const PRESETS = [
    {key: 'home', lat: 0, lng: 0},
    {key: 'hanoi', lat: 21.0285, lng: 105.8048},
    {key: 'halong', lat: 20.9517, lng: 107.08},
    {key: 'danang', lat: 16.0544, lng: 108.2022},
    {key: 'hcmc', lat: 10.7769, lng: 106.7009},
] as const;
const TIMES = ['now', 'plus3', 'plus6', 'tomorrow', 'custom'] as const;
type TimeChoice = typeof TIMES[number];

const round = (value: number) => Math.round(value * 1e4) / 1e4;
const samePoint = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => round(a.lat) === round(b.lat) && round(a.lng) === round(b.lng);
const row = (active: boolean) => cn(
    'flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-sm transition-colors',
    active ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50',
);

function timeFor(choice: 'plus3' | 'plus6' | 'tomorrow'): string {
    const date = new Date();
    if (choice === 'tomorrow') {
        date.setDate(date.getDate() + 1);
        date.setHours(7, 0, 0, 0);
    } else {
        date.setHours(date.getHours() + (choice === 'plus3' ? 3 : 6), 0, 0, 0);
    }
    return localIso(date);
}

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
 * The "Flight weather" page shared by the three portals. Filters sit in one column (place, then hour);
 * the map shows every place as its sky icon and temperature at that hour, so sunny and rainy areas read
 * at a glance; the card gives the full take-off assessment for the picked point. Crews and admins with
 * STATION_VIEW also see their ground stations.
 */
export function FlightWeatherWorkspace({showStations = false}: { showStations?: boolean }) {
    const {t} = useI18n();
    const {can, permissionsReady} = useAuth();
    const {config} = useMapConfig();
    const [point, setPoint] = useState<{ lat: number; lng: number; label: string } | null>(null);
    const [choice, setChoice] = useState<TimeChoice>('now');
    const [at, setAt] = useState<string | undefined>(undefined);
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<string | null>(null);

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

    const pickTime = (next: TimeChoice) => {
        setChoice(next);
        if (next === 'now') setAt(undefined);
        else if (next !== 'custom') setAt(timeFor(next));
        else setAt(previous => previous ?? timeFor('plus3'));
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
                <FilterGroup icon={<Clock3 size={12}/>} title={t('weather.workspace.time')}>
                    {TIMES.map(option => (
                        <button key={option} type="button" aria-pressed={choice === option} className={row(choice === option)}
                                onClick={() => pickTime(option)}>{t(`weather.workspace.times.${option}`)}</button>
                    ))}
                    {choice === 'custom' && (
                        <input type="datetime-local" aria-label={t('weather.workspace.times.custom')} value={at ?? ''}
                               onChange={event => setAt(event.target.value || undefined)}
                               className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2 text-sm text-slate-800"/>
                    )}
                </FilterGroup>
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
                                      setChoice('custom');
                                      setAt(start);
                                  }}/>
        </div>
    );
}
