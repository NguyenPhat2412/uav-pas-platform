import React from 'react';
import {ProviderStorefrontScreen} from '@/components/marketplace/catalog/ProviderStorefrontScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.providers.storefront',
    portal: 'customer',
    section: 'services',
    requiresAuth: true,
};

export default function CustomerProviderStorefrontRoute() {
    return <ProviderStorefrontScreen/>;
}
