'use client';
import { Suspense } from 'react';
import { OperationsPage } from '@/components/layout/OperationsPage';
import { LoadingRows } from '@/components/data/WorkspaceState';
import { MaintenanceWorkspace } from '@/features/maintenance/MaintenanceWorkspace';
export default function MaintenancePage() {
  return <OperationsPage title="Bảo trì và sửa chữa" meta="Lịch định kỳ, phiếu sửa chữa và chi phí vật tư của đội UAV" permission="UAV_MANAGE" activeResource="maintenance"><Suspense fallback={<LoadingRows />}><MaintenanceWorkspace /></Suspense></OperationsPage>;
}
