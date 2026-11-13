import React from 'react';
import {AccountMoreSheet} from '@/components/profile/AccountMoreSheet';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.account-more',
    portal: 'customer',
    section: 'account',
    requiresAuth: true,
};

/**
 * Expo Router form-sheet screen behind the "Khác" tile of the account tab (security, services, language, text size).
 */
export default function CustomerAccountMoreRoute() {
    return <AccountMoreSheet/>;
}
