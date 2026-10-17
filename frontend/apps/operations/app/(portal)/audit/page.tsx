'use client';
import { AuditPanel } from '@/features/operations/components/AuditPanel';
import { OperationsPage } from '@/components/layout/OperationsPage';
export default function AuditPage() { return <OperationsPage title="Nhật ký hoạt động" meta="Tra cứu người thực hiện, thời gian và thay đổi trong hệ thống." permission="AUDIT_READ" activeResource="audit"><AuditPanel /></OperationsPage>; }
