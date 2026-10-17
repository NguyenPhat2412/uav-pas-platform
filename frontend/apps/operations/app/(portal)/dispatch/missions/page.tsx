'use client';

import { useState } from 'react';
import { MissionList } from '@/features/missions/components/MissionList';
import { useMissions } from '@/features/missions/hooks/useMissions';
import { OperationsPage } from '@/components/layout/OperationsPage';

export default function DispatchMissionsPage() {
  const { missions, isLoading, error, reload } = useMissions();
  const [search, setSearch] = useState('');
  const visible = search.trim() ? missions.filter(mission => `${mission.code} ${mission.title} ${mission.customerName || ''}`.toLowerCase().includes(search.toLowerCase())) : missions;
  return <OperationsPage title="Điều phối nhiệm vụ" meta="Xác nhận, phân bổ tài nguyên và theo dõi tiến độ nhiệm vụ" permission="MISSION_VIEW_ALL" activeResource="dispatch"><MissionList title="Nhiệm vụ vận hành" allowCreate={false} missions={visible} loading={isLoading} error={error} search={search} setSearch={setSearch} onRefresh={() => void reload()} /></OperationsPage>;
}
