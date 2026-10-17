'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useMissions } from '@/features/missions/hooks/useMissions';
import { MissionList } from '@/features/missions/components/MissionList';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';

export default function MissionsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { missions, isLoading: loading, error, reload } = useMissions();
  const [search, setSearch] = useState('');
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login'); }, [isAuthenticated, isLoading, router]);
  if (isLoading || !isAuthenticated) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  const visible = search.trim() ? missions.filter((mission) => `${mission.code} ${mission.title} ${mission.customerName || ''}`.toLowerCase().includes(search.toLowerCase())) : missions;
  return <AppShell><div className="w-full"><PageHeader title="Quản lý mission" action={{ label: 'Tạo mission', href: '/missions/create' }} /><MissionList missions={visible} loading={loading} error={error} search={search} setSearch={setSearch} onRefresh={() => void reload()} /></div></AppShell>;
}
