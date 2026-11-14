import React from 'react';
import {Stack} from 'expo-router';
import {AppNotFoundView} from '@/components/shared/AppStatusViews';

export const ROUTE_META = {
    id: 'root.not-found',
    portal: 'root',
    section: 'status',
    requiresAuth: false,
} as const;

/**
 * Unmatched route / broken deep-link fallback across Customer, Operations, and Admin mobile flows.
 */
export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{headerShown: false}}/>
            <AppNotFoundView/>
        </>
    );
}
