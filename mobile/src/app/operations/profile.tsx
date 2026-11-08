import React from 'react';
import {ProfileScreen} from '@/components/profile/ProfileScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.profile',
    portal: 'operations',
    section: 'account',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations profile settings route. */
export default function OperationsProfileRoute() {
    return <ProfileScreen/>;
}
