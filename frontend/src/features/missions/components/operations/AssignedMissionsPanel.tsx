'use client';

import {MissionList} from '@/features/missions/components/MissionList';
import {useMissions} from '@/lib/query/operations';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function AssignedMissionsPage() {
    const {missions, isLoading, error, reload} = useMissions();
    const {t} = useI18n();
    return <OperationsPage
                           permission="MISSION_VIEW" activeResource="assigned-missions"><MissionList
        label={t('opsMissions.assigned.title')} missions={missions} loading={isLoading} error={error} onRefresh={() => void reload()}/></OperationsPage>;
}
