import React from 'react';
import {OperationsMissionDetailScreen} from '@/components/operations/OperationsMissionDetailScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.mission.detail',
    portal: 'operations',
    section: 'missions',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations mission execution detail route. */
export default function OperationsOperationsMissionDetailRoute() {
    return <OperationsMissionDetailScreen/>;
}
