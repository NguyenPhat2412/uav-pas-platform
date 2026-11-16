import React from 'react';
import {ProviderOnboardingScreen} from '@/components/marketplace/provider/ProviderOnboardingScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.provider.onboarding',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

export default function CustomerProviderOnboardingRoute() {
    return <ProviderOnboardingScreen/>;
}
