'use client';
import {useMissionWeather} from '@/hooks/weather/useWeather';
import type {Mission} from '@/types/customer';

/** Flight-safety weather at the mission site from the backend (cached, wind at 10/80/120 m, Kp). */
export function useSiteWeather(mission: Pick<Mission, 'id' | 'latitude' | 'longitude'>) {
    return useMissionWeather(mission.id, mission.latitude != null && mission.longitude != null);
}
