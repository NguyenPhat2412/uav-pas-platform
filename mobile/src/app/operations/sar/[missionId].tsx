import React from 'react';
import {SarCockpitScreen} from '@/components/operations/SarCockpitScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.sar.cockpit',
    portal: 'operations',
    section: 'sar',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations SAR mission cockpit route. */
export default function OperationsSarCockpitRoute() {
    return <SarCockpitScreen/>;
}
