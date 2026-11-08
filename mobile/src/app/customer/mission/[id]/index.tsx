import React from 'react';
import {MissionDetailScreen} from '@/components/mission/MissionDetailScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.mission.detail',
    portal: 'customer',
    section: 'missions',
    requiresAuth: true,
};

/** Expo Router screen entry for viewing a customer mission detail. */
export default function CustomerMissionDetailRoute() {
    return <MissionDetailScreen/>;
}
