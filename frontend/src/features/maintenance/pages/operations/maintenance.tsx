'use client';
import {Suspense} from 'react';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {LoadingRows} from '@/components/data/WorkspaceState';
import {MaintenanceWorkspace} from '@/features/maintenance/MaintenanceWorkspace';
import {useI18n} from '@/contexts/I18nContext';

export default function MaintenancePage() {
    const {t} = useI18n();
    return <OperationsPage title={t('opsAssets.pages.maintenance.title')} meta={t('opsAssets.pages.maintenance.meta')}
                           permission="UAV_MANAGE" activeResource="maintenance"><Suspense
        fallback={<LoadingRows/>}><MaintenanceWorkspace/></Suspense></OperationsPage>;
}
