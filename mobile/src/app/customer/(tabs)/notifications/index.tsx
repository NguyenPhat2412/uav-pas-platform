import React from 'react';
import {NotificationsScreen} from '@/components/notification/NotificationsScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.tabs.notifications',
    portal: 'customer',
    section: 'notifications',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer notifications tab. */
export default function CustomerNotificationsRoute() {
    return <NotificationsScreen/>;
}
