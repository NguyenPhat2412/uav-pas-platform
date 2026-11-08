'use client';

import {useEffect} from 'react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {claimWelcome} from '@/lib/welcome-flag';

/**
 * Greets the signed-in user once per browser session (a new tab or a fresh sign-in greets again);
 * moving between pages or portals in the same session stays quiet.
 */
export function WelcomeBack() {
    const {user, isAuthenticated} = useAuth();
    const {t} = useI18n();
    const name = user?.fullName || user?.username;

    useEffect(() => {
        if (!isAuthenticated || !user?.id || !name || !claimWelcome(user.id)) return;
        toast.success(t('shell.welcomeBackMessage', {name}), t('shell.welcomeBack'));
    }, [isAuthenticated, user?.id, name, t]);

    return null;
}
