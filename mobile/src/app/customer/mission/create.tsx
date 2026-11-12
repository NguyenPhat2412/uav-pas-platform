import React from 'react';
import {MissionCreateScreen} from '@/components/mission/MissionFormScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.mission.create',
    portal: 'customer',
    section: 'missions',
    requiresAuth: true,
};

/** Expo Router screen entry for creating a new customer mission. */
export default function CustomerMissionCreateRoute() {
    return <MissionCreateScreen/>;
}
