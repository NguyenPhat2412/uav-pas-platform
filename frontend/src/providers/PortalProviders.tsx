"use client";
import type {ReactNode} from 'react';
import {QueryProvider} from '@/providers/QueryProvider';
import {AuthProvider} from '@/providers/AuthContext';
import {I18nProvider} from '@/providers/I18nContext';
import {ToastProvider} from '@/providers/ToastContext';

export function PortalProviders({children, area}: { children: ReactNode; area: 'customer' | 'operations' | 'admin' }) {
    return (
        <ToastProvider>
            <I18nProvider area={area}>
                <QueryProvider>
                    <AuthProvider>{children}</AuthProvider>
                </QueryProvider>
            </I18nProvider>
        </ToastProvider>
    );
}
