'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useMissions } from '@/features/missions/hooks/useMissions';
import { MissionList } from '@/features/missions/components/MissionList';

export default function OperatorMissionsPage() {
  const { isAuthenticated, isLoading } = useAuth(); const router = useRouter(); const { missions, isLoading: loading, error, reload } = useMissions(); const [search, setSearch] = useState('');
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login'); }, [isAuthenticated, isLoading, router]);
  if (isLoading || !isAuthenticated) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  const visible = search.trim() ? missions.filter((mission) => `${mission.code} ${mission.title}`.toLowerCase().includes(search.toLowerCase())) : missions;
  return <main className="min-h-screen bg-surface p-4 sm:p-8"><div className="max-w-6xl mx-auto space-y-5"><Link href="/" className="inline-flex items-center gap-2 text-sm text-secondary"><ArrowLeft size={16} /> Dashboard</Link><MissionList title="Mission được giao" allowCreate={false} missions={visible} loading={loading} error={error} search={search} setSearch={setSearch} onRefresh={() => void reload()} /></div></main>;
}
