'use client';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
export function Providers({ children }: { children: ReactNode }) { return <QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider>; }
