'use client';
import {AuditPanel} from "@/components/audit/AuditPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function AuditPage() {
    return <OperationsPage permission="AUDIT_READ"
                           activeResource="audit"><AuditPanel/></OperationsPage>;
}
