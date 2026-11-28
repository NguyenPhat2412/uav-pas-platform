'use client';

import {useMemo} from 'react';
import {MissionList} from '@/components/mission/MissionList';
import {OperatorLogbookSummary} from '@/components/mission/operations/OperatorLogbookSummary';
import {PilotTodayWorkspace} from '@/components/mission/operations/PilotTodayWorkspace';
import {useProviderOrders} from '@/hooks/useMarketplace';
import {useMissions} from '@/hooks/useOperationsMissions';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';

export default function AssignedMissionsPage() {
    const {isAuthenticated} = useAuth();
    const {missions: opsMissions, isLoading, error, reload} = useMissions();
    const providerOrdersQuery = useProviderOrders(isAuthenticated);
    const {t} = useI18n();

    const missions = useMemo(() => {
        const byId = new Map<number, (typeof opsMissions)[number]>();
        for (const m of opsMissions) byId.set(m.id, m);
        for (const m of providerOrdersQuery.data ?? []) {
            if (!byId.has(m.id)) byId.set(m.id, m);
        }
        return Array.from(byId.values());
    }, [opsMissions, providerOrdersQuery.data]);

    const effectiveError = missions.length > 0 ? null : error;
    const handleRefresh = () => {
        void reload();
        void providerOrdersQuery.refetch();
    };

    return (
        <OperationsPage permission="MISSION_VIEW" activeResource="assigned-missions">
            <PilotTodayWorkspace
                missions={missions}
                loading={isLoading && providerOrdersQuery.isLoading}
                error={effectiveError}
                onRefresh={handleRefresh}
            />
            <OperatorLogbookSummary />
            <MissionList
                label={t('opsMissions.assigned.title')}
                missions={missions}
                loading={isLoading && providerOrdersQuery.isLoading}
                error={effectiveError}
                onRefresh={handleRefresh}
            />
        </OperationsPage>
    );
}
