import React from 'react';
import {AdminSupportInboxScreen} from '@/components/support/AdminSupportInboxScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.support',
    portal: 'operations',
    section: 'administration',
    requiresAuth: true,
};

/**
 * Expo Router screen entry for the Operations Admin Support Inbox & 1-Tap Quick-Reply Workspace.
 * Supports optional `?threadId=` deep-linking from push and in-app notifications.
 */
export default function OperationsSupportInboxRoute() {
    return <AdminSupportInboxScreen/>;
}
