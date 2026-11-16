import React from 'react';
import {ProviderHubScreen} from '@/components/marketplace/provider/ProviderHubScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.provider.hub',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

export default function CustomerProviderHubRoute() {
    return <ProviderHubScreen/>;
}
