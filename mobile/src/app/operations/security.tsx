import React from 'react';
import {SecurityScreen} from '@/components/profile/SecurityScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.security',
    portal: 'operations',
    section: 'account',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations security and password route. */
export default function OperationsSecurityRoute() {
    return <SecurityScreen/>;
}
