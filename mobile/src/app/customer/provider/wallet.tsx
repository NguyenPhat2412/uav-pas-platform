import React from 'react';
import {ProviderWalletScreen} from '@/components/marketplace/provider/ProviderWalletScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.provider.wallet',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

export default function CustomerProviderWalletRoute() {
    return <ProviderWalletScreen/>;
}
