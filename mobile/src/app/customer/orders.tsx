import React from 'react';
import {CustomerOrdersScreen} from '@/components/order/CustomerOrdersScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.orders',
    portal: 'customer',
    section: 'orders',
    requiresAuth: true,
};

/** Expo Router entry for the Shopee-style 5-group filtered customer orders list. */
export default function CustomerOrdersRoute() {
    return <CustomerOrdersScreen/>;
}
