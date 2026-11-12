import React from 'react';
import {ForgotPasswordScreen} from '@/components/auth/ForgotPasswordScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'auth.forgotPassword',
    portal: 'auth',
    section: 'authentication',
    requiresAuth: false,
};

/** Expo Router screen entry for the password recovery route. */
export default function AuthForgotPasswordRoute() {
    return <ForgotPasswordScreen/>;
}
