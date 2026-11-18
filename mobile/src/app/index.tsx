import React from 'react';
import {Redirect} from 'expo-router';
import {useAuth} from '@/providers/AuthContext';
import {AppSplash, AppUnreachable} from '@/components/shared/AppStatusViews';
import {resolvePortalEntryHref} from '@/utils/operations/portal-routing';

export const ROUTE_META = {
    id: 'root.index',
    portal: 'root',
    section: 'entry',
    requiresAuth: false,
} as const;

/**
 * Entry: signed-in accounts enter their active portal; guests land directly on the Customer Marketplace
 * (/customer/home) so they can browse flight packages, prices, and verified partner shops before signing in.
 */
export default function Index() {
    const {status, activePortal, retry, logout} = useAuth();
    if (status === 'loading') return <AppSplash/>;
    if (status === 'unreachable') return <AppUnreachable onRetry={retry} onSignOut={() => void logout()}/>;
    return <Redirect href={status === 'signed-in' ? resolvePortalEntryHref(activePortal) : '/customer/home'}/>;
}
