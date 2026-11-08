import React from 'react';
import {SecurityScreen} from '@/components/profile/SecurityScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.security',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer security and password route. */
export default function CustomerSecurityRoute() {
    return <SecurityScreen/>;
}
