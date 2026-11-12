import React from 'react';
import {MissionEditScreen} from '@/components/mission/MissionFormScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.mission.edit',
    portal: 'customer',
    section: 'missions',
    requiresAuth: true,
};

/** Expo Router screen entry for editing an existing customer mission. */
export default function CustomerMissionEditRoute() {
    return <MissionEditScreen/>;
}
