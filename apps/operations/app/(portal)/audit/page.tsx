'use client';
import { AuditPanel } from '@/features/operations/components/AuditPanel';
import { OperationsPage } from '@/components/layout/OperationsPage';
export default function AuditPage() { return <OperationsPage title="Audit" meta="Nhật ký thao tác từ backend" permission="AUDIT_READ" activeResource="audit"><AuditPanel /></OperationsPage>; }
