'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PermissionGate } from '@/components/data/WorkspaceState';
import { useAuth } from '@/contexts/AuthContext';

export function OperationsPage({ title, meta, permission, activeResource, children }: { title: string; meta?: string; permission: string; activeResource: string; children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const isDemo = isMounted && typeof window !== 'undefined' && window.location.search.includes('demo=true');
  useEffect(() => { 
    if (isMounted && !isDemo && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, isDemo, isMounted]);

  if (isDemo) {
    return <AppShell activeResource={activeResource}><PageHeader title={title} meta={meta} />{children}</AppShell>;
  }

  if (isLoading || !isAuthenticated) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" label="Đang xác thực" /></div>;
  return <AppShell activeResource={activeResource}><PageHeader title={title} meta={meta} /><PermissionGate code={permission}>{children}</PermissionGate></AppShell>;
}
