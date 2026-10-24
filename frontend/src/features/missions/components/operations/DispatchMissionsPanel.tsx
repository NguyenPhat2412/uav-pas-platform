'use client';

import {useState} from 'react';
import {MissionList} from '@/features/missions/components/MissionList';
import {useMissions} from '@/features/missions/hooks/useMissions';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function DispatchMissionsPage() {
    const {missions, isLoading, error, reload} = useMissions();
    const {t} = useI18n();
    const [search, setSearch] = useState('');
    const visible = search.trim() ? missions.filter(mission => `${mission.code} ${mission.title} ${mission.customerName || ''}`.toLowerCase().includes(search.toLowerCase())) : missions;
    return <OperationsPage title={t('opsMissions.dispatch.title')} meta={t('opsMissions.dispatch.meta')}
                           permission="MISSION_VIEW_ALL" activeResource="dispatch"><MissionList
        title={t('opsMissions.dispatch.listTitle')} allowCreate={false} missions={visible} loading={isLoading} error={error}
        search={search} setSearch={setSearch} onRefresh={() => void reload()}/></OperationsPage>;
}
