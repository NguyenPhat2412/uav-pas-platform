import {AdminPage} from '@/components/layout/AdminPage';
import {AuditLogs} from "@/features/audit/components/AdminAuditLogs";

export default function Page() {
    return <AdminPage title="admin.pages.auditLogs.title" meta="admin.pages.auditLogs.meta"
                      permission="AUDIT_READ" activeResource="audit-logs"><AuditLogs/></AdminPage>;
}
