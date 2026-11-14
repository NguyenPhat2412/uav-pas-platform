import React from 'react';
import {NotificationsScreen} from '@/components/notification/NotificationsScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.notifications',
    portal: 'customer',
    section: 'notifications',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer notifications screen, opened from the bell on the home header. */
export default function CustomerNotificationsRoute() {
    return <NotificationsScreen/>;
}
