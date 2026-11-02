import React from 'react';
import {Redirect, Stack} from 'expo-router';
import {useAuth} from '@/providers/AuthContext';
import {colors} from '@/styles/tokens';

export default function AuthGroupLayout() {
    const {status} = useAuth();
    // A finished sign-in (on any of these screens) lands in the portal.
    if (status === 'signed-in') return <Redirect href="/customer/home"/>;
    return <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: colors.canvas}}}/>;
}
