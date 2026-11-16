import React from 'react';
import {ProviderListingsScreen} from '@/components/marketplace/provider/ProviderListingsScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.provider.listings',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

export default function CustomerProviderListingsRoute() {
    return <ProviderListingsScreen/>;
}
