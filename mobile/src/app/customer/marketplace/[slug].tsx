import React from 'react';
import {MarketplaceListingDetailScreen} from '@/components/marketplace/catalog/MarketplaceListingDetailScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.marketplace.detail',
    portal: 'customer',
    section: 'services',
    requiresAuth: true,
};

export default function CustomerMarketplaceListingRoute() {
    return <MarketplaceListingDetailScreen/>;
}
