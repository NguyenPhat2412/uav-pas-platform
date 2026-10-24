import {AdminPage} from '@/components/layout/AdminPage';
import {AuditLogs} from "@/features/audit/components/AdminAuditLogs";

export default function Page() {
    return <AdminPage title="admin.pages.auditLogs.title"
                      permission="AUDIT_READ" activeResource="audit-logs"><AuditLogs/></AdminPage>;
}
