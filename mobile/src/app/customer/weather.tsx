import React from 'react';
import {WeatherScreen} from '@/components/weather/WeatherScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.weather',
    portal: 'customer',
    section: 'weather',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer weather and airspace screen, opened from the home weather card. */
export default function CustomerWeatherRoute() {
    return <WeatherScreen/>;
}
