import React from 'react';
import {OperationsMissionsScreen} from '@/components/operations/OperationsMissionsScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.tabs.missions',
    portal: 'operations',
    section: 'missions',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations mission queue and logbook tab. */
export default function OperationsOperationsMissionsRoute() {
    return <OperationsMissionsScreen/>;
}
