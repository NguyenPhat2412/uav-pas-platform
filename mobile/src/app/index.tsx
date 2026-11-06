import React from 'react';
import {Redirect} from 'expo-router';
import {useAuth} from '@/providers/AuthContext';
import {AppSplash, AppUnreachable} from '@/components/shared/AppStatusViews';
import {resolvePortalEntryHref} from '@/utils/operations/portal-routing';

/** Entry: the Keychain session and active workspace decide between sign-in, Customer, and Operations. */
export default function Index() {
    const {status, activePortal, retry, logout} = useAuth();
    if (status === 'loading') return <AppSplash/>;
    if (status === 'unreachable') return <AppUnreachable onRetry={retry} onSignOut={() => void logout()}/>;
    return <Redirect href={status === 'signed-in' ? resolvePortalEntryHref(activePortal) : '/login'}/>;
}
