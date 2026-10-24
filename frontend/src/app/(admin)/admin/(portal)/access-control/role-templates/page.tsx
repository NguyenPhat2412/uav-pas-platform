import {AdminPage} from '@/components/layout/AdminPage';
import {AccessHub} from "@/features/access/components/AccessHub";

export default function AdminAccessRoleTemplatesPage() {
    return <AdminPage title="admin.pages.access.title" meta="admin.pages.access.templatesMeta"
                      permission="PERMISSION_MANAGE" activeResource="access-control"><AccessHub tab="templates"/></AdminPage>;
}
