import React from 'react';
import {LoginScreen} from '@/components/auth/LoginScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'auth.login',
    portal: 'auth',
    section: 'authentication',
    requiresAuth: false,
};

/** Expo Router screen entry for the sign-in route. */
export default function AuthLoginRoute() {
    return <LoginScreen/>;
}
