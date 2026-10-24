'use client';

import {useState} from 'react';
import {MissionList} from '@/features/missions/components/MissionList';
import {useMissions} from '@/features/missions/hooks/useMissions';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function AssignedMissionsPage() {
    const {missions, isLoading, error, reload} = useMissions();
    const {t} = useI18n();
    const [search, setSearch] = useState('');
    const visible = search.trim() ? missions.filter(mission => `${mission.code} ${mission.title}`.toLowerCase().includes(search.toLowerCase())) : missions;
    return <OperationsPage title={t('opsMissions.assigned.title')} meta={t('opsMissions.assigned.meta')}
                           permission="MISSION_VIEW" activeResource="assigned-missions"><MissionList
        title={t('opsMissions.assigned.title')} allowCreate={false} missions={visible} loading={isLoading} error={error}
        search={search} setSearch={setSearch} onRefresh={() => void reload()}/></OperationsPage>;
}
