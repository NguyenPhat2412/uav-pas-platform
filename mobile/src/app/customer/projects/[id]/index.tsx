import React from 'react';
import {ProjectDetailScreen} from '@/components/project/ProjectDetailScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.projects.detail',
    portal: 'customer',
    section: 'projects',
    requiresAuth: true,
};

/** Expo Router entry for Customer Project detail, subscriptions, and orders. */
export default function CustomerProjectDetailRoute() {
    return <ProjectDetailScreen/>;
}
