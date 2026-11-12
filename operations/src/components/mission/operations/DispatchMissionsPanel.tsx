'use client';

import {MissionList} from '@/components/mission/MissionList';
import {useMissions} from '@/hooks/mission/useOperationsMissions';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/providers/I18nContext';

export default function DispatchMissionsPage() {
    const {missions, isLoading, error, reload} = useMissions();
    const {t} = useI18n();
    return <OperationsPage
                           permission="MISSION_VIEW_ALL" activeResource="dispatch"><MissionList
        label={t('opsMissions.dispatch.listTitle')} missions={missions} loading={isLoading} error={error} showCustomer onRefresh={() => void reload()}/></OperationsPage>;
}
