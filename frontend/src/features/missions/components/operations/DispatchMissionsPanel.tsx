'use client';

import {MissionList} from '@/features/missions/components/MissionList';
import {useMissions} from '@/features/missions/hooks/useMissions';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function DispatchMissionsPage() {
    const {missions, isLoading, error, reload} = useMissions();
    const {t} = useI18n();
    return <OperationsPage
                           permission="MISSION_VIEW_ALL" activeResource="dispatch"><MissionList
        label={t('opsMissions.dispatch.listTitle')} missions={missions} loading={isLoading} error={error} showCustomer onRefresh={() => void reload()}/></OperationsPage>;
}
