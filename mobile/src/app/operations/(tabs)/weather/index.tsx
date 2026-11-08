import React from 'react';
import {WeatherScreen} from '@/components/weather/WeatherScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.tabs.weather',
    portal: 'operations',
    section: 'weather',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations weather and airspace tab. */
export default function OperationsWeatherRoute() {
    return <WeatherScreen/>;
}
