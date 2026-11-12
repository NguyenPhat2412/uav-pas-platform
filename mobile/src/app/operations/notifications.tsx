import React from 'react';
import {NotificationsScreen} from '@/components/notification/NotificationsScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.notifications',
    portal: 'operations',
    section: 'notifications',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations notifications route. */
export default function OperationsNotificationsRoute() {
    return <NotificationsScreen portal="operations"/>;
}
