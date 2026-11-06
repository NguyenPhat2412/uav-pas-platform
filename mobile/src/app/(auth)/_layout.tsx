import React from 'react';
import {Redirect, Stack} from 'expo-router';
import {useAuth} from '@/providers/AuthContext';
import {resolvePortalEntryHref} from '@/utils/operations/portal-routing';
import {colors} from '@/styles/tokens';

export default function AuthGroupLayout() {
    const {status, activePortal} = useAuth();
    // A finished sign-in (on any of these screens) lands in the resolved role workspace.
    if (status === 'signed-in') return <Redirect href={resolvePortalEntryHref(activePortal)}/>;
    return <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: colors.canvas}}}/>;
}
