'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PermissionGate } from '@/components/data/WorkspaceState';
import { useAuth } from '@/contexts/AuthContext';

export function OperationsPage({ title, meta, permission, activeResource, children }: { title: string; meta?: string; permission: string | null; activeResource: string; children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" label="Đang xác thực" /></div>;
  return <AppShell activeResource={activeResource}><PageHeader title={title} meta={meta} />{permission ? <PermissionGate code={permission}>{children}</PermissionGate> : children}</AppShell>;
}
