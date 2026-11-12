'use client';

import {useI18n} from '@/providers/I18nContext';
import {useForecastAssessment} from '@/hooks/weather/useWeather';
import {PreflightWeatherCard} from '@/components/weather/PreflightWeatherCard';
import {applyFlightWindow} from '@/utils/weather/flight-window';
import type {MissionInput} from '@/types/mission/mission.types';

type PlannedFlight = Pick<MissionInput, 'latitude' | 'longitude' | 'startTime' | 'expectedEndTime' | 'requestedDate' | 'serviceId'>;

/**
 * Weather advice while a customer plans a mission: appears once the site is picked, follows the
 * chosen start time and service wind limit, and applies a recommended window in one click.
 */
export function MissionWeatherAdvisor<T extends PlannedFlight>({form, onChange, className}: {
    form: T;
    onChange: (update: (value: T) => T) => void;
    className?: string;
}) {
    const {t} = useI18n();
    const located = form.latitude != null && form.longitude != null;
    const query = useForecastAssessment(located
        ? {lat: form.latitude!, lng: form.longitude!, at: form.startTime || undefined, serviceId: form.serviceId ?? undefined}
        : null);
    return <PreflightWeatherCard className={className}
                                 assessment={located ? query.data : null}
                                 isPending={located && query.isPending}
                                 isError={located && query.isError}
                                 emptyMessage={t('weather.preflight.pickLocation')}
                                 onSelectWindow={start => onChange(value => applyFlightWindow(value, start))}/>;
}
