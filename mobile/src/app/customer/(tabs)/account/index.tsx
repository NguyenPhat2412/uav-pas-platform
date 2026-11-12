import React from 'react';
import {AccountScreen} from '@/components/profile/AccountScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.tabs.account',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer account hub tab. */
export default function CustomerAccountRoute() {
    return <AccountScreen/>;
}
