import React from 'react';
import {Redirect} from 'expo-router';
import {useAuth} from '@/providers/AuthContext';
import {AppSplash, AppUnreachable} from '@/components/shared/AppStatusViews';

/** Entry: the Keychain session decides between sign-in and the portal. */
export default function Index() {
    const {status, retry, logout} = useAuth();
    if (status === 'loading') return <AppSplash/>;
    if (status === 'unreachable') return <AppUnreachable onRetry={retry} onSignOut={() => void logout()}/>;
    return <Redirect href={status === 'signed-in' ? '/customer/home' : '/login'}/>;
}
