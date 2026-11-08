import React from 'react';
import {HomeScreen} from '@/components/home/HomeScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.tabs.home',
    portal: 'customer',
    section: 'dashboard',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer home dashboard tab. */
export default function CustomerHomeRoute() {
    return <HomeScreen/>;
}
