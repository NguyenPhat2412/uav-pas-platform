import React from 'react';
import {WeatherScreen} from '@/components/weather/WeatherScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.tabs.weather',
    portal: 'customer',
    section: 'weather',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer weather and airspace tab. */
export default function CustomerWeatherRoute() {
    return <WeatherScreen/>;
}
