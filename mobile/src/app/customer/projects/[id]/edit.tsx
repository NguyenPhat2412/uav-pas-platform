import React from 'react';
import {ProjectEditScreen} from '@/components/project/ProjectFormScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.projects.edit',
    portal: 'customer',
    section: 'projects',
    requiresAuth: true,
};

/** Expo Router entry for editing an existing Customer Project. */
export default function CustomerProjectEditRoute() {
    return <ProjectEditScreen/>;
}
