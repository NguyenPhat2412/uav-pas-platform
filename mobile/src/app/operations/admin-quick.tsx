import React from 'react';
import {AdminQuickActionsScreen} from '@/components/operations/AdminQuickActionsScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.adminQuick',
    portal: 'operations',
    section: 'administration',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations admin quick actions route. */
export default function OperationsAdminQuickActionsRoute() {
    return <AdminQuickActionsScreen/>;
}
