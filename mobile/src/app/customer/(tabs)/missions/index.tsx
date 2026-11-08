import React from 'react';
import {MissionListScreen} from '@/components/mission/MissionListScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.tabs.missions',
    portal: 'customer',
    section: 'missions',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer mission list tab. */
export default function CustomerMissionListRoute() {
    return <MissionListScreen/>;
}
