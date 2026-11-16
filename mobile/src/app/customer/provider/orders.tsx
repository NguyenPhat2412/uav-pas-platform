import React from 'react';
import {ProviderOrdersScreen} from '@/components/marketplace/provider/ProviderOrdersScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.provider.orders',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

export default function CustomerProviderOrdersRoute() {
    return <ProviderOrdersScreen/>;
}
