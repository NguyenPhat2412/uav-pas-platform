import React from 'react';
import {RegisterScreen} from '@/components/auth/RegisterScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'auth.register',
    portal: 'auth',
    section: 'authentication',
    requiresAuth: false,
};

/** Expo Router screen entry for the customer registration route. */
export default function AuthRegisterRoute() {
    return <RegisterScreen/>;
}
