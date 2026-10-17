'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';

export function Providers({ children }: { children: ReactNode }) {
  return <I18nProvider><QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider></I18nProvider>;
}
