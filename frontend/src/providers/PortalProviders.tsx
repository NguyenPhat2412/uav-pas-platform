"use client";
import type { ReactNode } from 'react';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';

export function PortalProviders({ children, area }: { children: ReactNode; area: 'customer' | 'operations' | 'admin' }) {
  return <I18nProvider area={area}><QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider></I18nProvider>;
}
