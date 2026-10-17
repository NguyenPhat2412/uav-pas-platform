'use client';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <I18nProvider>{children}</I18nProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
