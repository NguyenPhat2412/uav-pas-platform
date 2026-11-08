import React from 'react';
import {SarMissionsScreen} from '@/components/operations/SarMissionsScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.tabs.sar',
    portal: 'operations',
    section: 'sar',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations search and rescue tab. */
export default function OperationsSarMissionsRoute() {
    return <SarMissionsScreen/>;
}
