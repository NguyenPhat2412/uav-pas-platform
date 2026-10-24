'use client';
import {Suspense} from 'react';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {LoadingRows} from '@/components/data/WorkspaceState';
import {MaintenanceWorkspace} from '@/features/maintenance/components/MaintenanceWorkspace';

export default function MaintenancePage() {
    return <OperationsPage
                           permission="UAV_MANAGE" activeResource="maintenance"><Suspense
        fallback={<LoadingRows/>}><MaintenanceWorkspace/></Suspense></OperationsPage>;
}
