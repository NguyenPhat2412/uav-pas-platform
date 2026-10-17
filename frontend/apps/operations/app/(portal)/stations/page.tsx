'use client';
import { StationPanel } from '@/features/operations/components/StationPanel';
import { OperationsPage } from '@/components/layout/OperationsPage';
export default function StationsPage() { return <OperationsPage title="Trạm UAV" meta="Trạng thái, vị trí và lịch sử vận hành của các trạm" permission="STATION_READ" activeResource="stations"><StationPanel /></OperationsPage>; }
