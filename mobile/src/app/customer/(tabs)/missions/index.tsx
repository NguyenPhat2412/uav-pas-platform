import React from 'react';
import {ProjectListScreen} from '@/components/project/ProjectListScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.tabs.missions',
    portal: 'customer',
    section: 'projects',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer Projects tab (S1-mobile.md #3). */
export default function CustomerMissionListRoute() {
    return <ProjectListScreen/>;
}
