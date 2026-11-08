import React from 'react';
import {OperationsAccountScreen} from '@/components/operations/OperationsAccountScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.tabs.account',
    portal: 'operations',
    section: 'account',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations account hub tab. */
export default function OperationsOperationsAccountRoute() {
    return <OperationsAccountScreen/>;
}
