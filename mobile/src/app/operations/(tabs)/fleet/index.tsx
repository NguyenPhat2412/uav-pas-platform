import React from 'react';
import {FleetMaintenanceScreen} from '@/components/uav/FleetMaintenanceScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.tabs.fleet',
    portal: 'operations',
    section: 'fleet',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations fleet and maintenance tab. */
export default function OperationsFleetMaintenanceRoute() {
    return <FleetMaintenanceScreen/>;
}
