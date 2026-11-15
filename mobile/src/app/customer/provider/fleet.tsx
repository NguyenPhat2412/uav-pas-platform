import React from 'react';
import {ProviderFleetScreen} from '@/components/marketplace/ProviderFleetScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.provider.fleet',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

export default function CustomerProviderFleetRoute() {
    return <ProviderFleetScreen/>;
}
