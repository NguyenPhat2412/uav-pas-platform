"use client";
import type {ReactNode} from 'react';
import {QueryProvider} from '@/providers/QueryProvider';
import {AuthProvider} from '@/providers/AuthContext';
import {I18nProvider} from '@/providers/I18nContext';
import {ToastProvider} from '@/providers/ToastContext';
import {ConfirmProvider} from '@/providers/ConfirmContext';

export function PortalProviders({children, area}: { children: ReactNode; area: 'customer' | 'operations' | 'admin' }) {
    return (
        <ToastProvider>
            <I18nProvider area={area}>
                <ConfirmProvider>
                    <QueryProvider>
                        <AuthProvider>{children}</AuthProvider>
                    </QueryProvider>
                </ConfirmProvider>
            </I18nProvider>
        </ToastProvider>
    );
}
