'use client';
import {useI18n} from '@/providers/I18nContext';
import {useSiteWeather} from '@/features/missions/hooks/useSiteWeather';
import {PreflightWeatherCard} from '@/features/weather/components/PreflightWeatherCard';
import type {Mission} from '@/types/customer';

/** Weather at the mission site for its start time; flight clearance remains the operations team's decision. */
export function SiteWeather({mission}: { mission: Mission }) {
    const {t} = useI18n();
    const weather = useSiteWeather(mission);
    return <PreflightWeatherCard assessment={weather.data} isPending={weather.isPending && weather.fetchStatus !== 'idle'}
                                 isError={weather.isError} emptyMessage={t('weather.noLocation')}/>;
}
