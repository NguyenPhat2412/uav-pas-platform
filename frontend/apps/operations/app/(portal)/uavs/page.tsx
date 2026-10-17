'use client';
import { UavPanel } from '@/features/operations/components/UavPanel';
import { OperationsPage } from '@/components/layout/OperationsPage';
export default function UavsPage() { return <OperationsPage title="Đội UAV" meta="Theo dõi đội bay và mở mô hình tham chiếu của từng UAV" permission="UAV_READ" activeResource="uavs"><UavPanel /></OperationsPage>; }
