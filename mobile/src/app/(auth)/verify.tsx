import React from 'react';
import {VerifyCodeScreen} from '@/components/auth/VerifyCodeScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'auth.verify',
    portal: 'auth',
    section: 'authentication',
    requiresAuth: false,
};

/** Expo Router screen entry for the OTP verification route. */
export default function AuthVerifyCodeRoute() {
    return <VerifyCodeScreen/>;
}
