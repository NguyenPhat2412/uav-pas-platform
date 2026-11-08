import React from 'react';
import {BillingScreen} from '@/components/billing/BillingScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.billing',
    portal: 'customer',
    section: 'billing',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer billing overview route. */
export default function CustomerBillingRoute() {
    return <BillingScreen/>;
}
