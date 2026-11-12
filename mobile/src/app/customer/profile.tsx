import React from 'react';
import {ProfileScreen} from '@/components/profile/ProfileScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.profile',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer profile settings route. */
export default function CustomerProfileRoute() {
    return <ProfileScreen/>;
}
