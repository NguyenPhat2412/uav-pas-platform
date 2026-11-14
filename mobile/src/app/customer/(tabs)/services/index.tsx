import React from 'react';
import {ServicesScreen} from '@/components/catalog/ServicesScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.tabs.services',
    portal: 'customer',
    section: 'catalog',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer UAV service catalog tab. */
export default function CustomerServicesRoute() {
    return <ServicesScreen/>;
}
