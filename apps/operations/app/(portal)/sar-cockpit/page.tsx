'use client';

import { SarCockpitPanel } from '@/features/sar/components/SarCockpitPanel';
import { OperationsPage } from '@/components/layout/OperationsPage';

export default function SarCockpitPage() {
  return (
    <OperationsPage
      title="Tác chiến AI & Tìm kiếm cứu nạn (SAR Cockpit)"
      meta="Giám sát trực quan luồng camera AI YOLOv8s, bản đồ tác chiến đa giác, telemetry UAV và trạng thái bo mạch KV260"
      permission="MISSION_VIEW"
      activeResource="sar-cockpit"
    >
      <SarCockpitPanel />
    </OperationsPage>
  );
}
