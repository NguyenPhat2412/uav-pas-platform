import React from 'react';
import {ProjectCreateScreen} from '@/components/project/ProjectFormScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.projects.create',
    portal: 'customer',
    section: 'projects',
    requiresAuth: true,
};

/** Expo Router entry for creating a new Customer Project. */
export default function CustomerProjectCreateRoute() {
    return <ProjectCreateScreen/>;
}
