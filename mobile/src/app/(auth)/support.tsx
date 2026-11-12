import React from 'react';
import {PublicSupportSheetScreen} from '@/components/support/PublicSupportSheetScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'auth.support',
    portal: 'auth',
    section: 'support',
    requiresAuth: false,
};

/**
 * Expo Router form-sheet screen entry for visitor direct contact and 2-way live support chat.
 */
export default function AuthSupportRoute() {
    return <PublicSupportSheetScreen/>;
}
