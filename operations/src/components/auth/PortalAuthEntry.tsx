'use client';

import React, {Suspense, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {PortalProviders} from '@/providers/PortalProviders';
import {AuthModalPopup, openAuthModal} from '@/components/auth/AuthModalPopup';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {canUsePortal, portalForRole, portalHome} from '@/utils/auth/portal';
import {Button} from '@/components/ui';

function PortalAuthGate({area, home}: { area: 'operations' | 'admin'; home: string }) {
    const {user, isAuthenticated, isLoading} = useAuth();
    const {t} = useI18n();
    const router = useRouter();
    const allowed = canUsePortal(user?.role, area);

    useEffect(() => {
        if (isLoading) return;
        if (isAuthenticated && allowed) {
            router.replace(home);
            return;
        }
        if (isAuthenticated && !allowed) {
            router.replace(portalHome(portalForRole(user?.role)));
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (!params.get('auth')) {
            openAuthModal('login', params.get('next') || home);
        }
    }, [allowed, home, isAuthenticated, isLoading, router, user?.role]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
            <div className="w-full max-w-md rounded-card border border-slate-800 bg-slate-900/90 p-6 text-center shadow-lg">
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    UAV PAS · {area === 'operations' ? 'Operations Center' : 'System Administration'}
                </p>
                <h1 className="mt-2 text-lg font-bold text-white">
                    {area === 'operations' ? t('publicFooter.operationsPortal') : t('publicFooter.adminPortal')}
                </h1>
                <p className="mt-1.5 text-xs text-slate-400">
                    {t('errors.unauthorized')}
                </p>
                <div className="mt-5 flex justify-center">
                    <Button
                        type="button"
                        onClick={() => openAuthModal('login', home)}
                    >
                        {t('auth.login.submit')}
                    </Button>
                </div>
            </div>
            <Suspense fallback={null}>
                <AuthModalPopup/>
            </Suspense>
        </div>
    );
}

export function PortalAuthEntry({area, home}: { area: 'operations' | 'admin'; home: string }) {
    return (
        <PortalProviders area={area}>
            <PortalAuthGate area={area} home={home}/>
        </PortalProviders>
    );
}
