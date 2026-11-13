import React from 'react';
import {PublicSupportSheetScreen} from '@/components/support/PublicSupportSheetScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.tabs.support',
    portal: 'customer',
    section: 'support',
    requiresAuth: true,
};

/**
 * Expo Router tab screen entry for customer direct contact and 2-way live support chat.
 */
export default function CustomerSupportRoute() {
    return <PublicSupportSheetScreen/>;
}
