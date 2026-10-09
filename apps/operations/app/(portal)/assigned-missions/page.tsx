'use client';

import { useState } from 'react';
import { MissionList } from '@/features/missions/components/MissionList';
import { useMissions } from '@/features/missions/hooks/useMissions';
import { OperationsPage } from '@/components/layout/OperationsPage';

export default function AssignedMissionsPage() {
  const { missions, isLoading, error, reload } = useMissions();
  const [search, setSearch] = useState('');
  const visible = search.trim() ? missions.filter(mission => `${mission.code} ${mission.title}`.toLowerCase().includes(search.toLowerCase())) : missions;
  return <OperationsPage title="Mission được giao" meta="Không gian làm việc của operator theo phạm vi backend trả về" permission="MISSION_VIEW" activeResource="assigned-missions"><MissionList title="Mission được giao" allowCreate={false} missions={visible} loading={isLoading} error={error} search={search} setSearch={setSearch} onRefresh={() => void reload()} /></OperationsPage>;
}
