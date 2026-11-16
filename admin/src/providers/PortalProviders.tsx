"use client";
import type {ReactNode} from 'react';
import {QueryProvider} from '@/providers/QueryProvider';
import {AuthProvider} from '@/providers/AuthContext';
import {I18nProvider} from '@/providers/I18nContext';
import {ToastProvider} from '@/providers/ToastContext';
import {ConfirmProvider} from '@/providers/ConfirmContext';
import {LiveNotificationPopupHost} from '@/components/notification/popup/LiveNotificationPopupHost';

export function PortalProviders({children, area}: { children: ReactNode; area: 'customer' | 'operations' | 'admin' }) {
    return (
        <ToastProvider>
            <I18nProvider area={area}>
                <ConfirmProvider>
                    <QueryProvider>
                        <AuthProvider>
                            {children}
                            <LiveNotificationPopupHost area={area}/>
                        </AuthProvider>
                    </QueryProvider>
                </ConfirmProvider>
            </I18nProvider>
        </ToastProvider>
    );
}
