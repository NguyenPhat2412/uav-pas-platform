import {AdminPage} from '@/components/layout/AdminPage';
import {AccessHub} from "@/features/access/components/AccessHub";

export default function AdminAccessRoleMatrixPage() {
    return <AdminPage title="admin.pages.access.title" meta="admin.pages.access.matrixMeta"
                      permission="PERMISSION_MANAGE" activeResource="access-control"><AccessHub tab="matrix"/></AdminPage>;
}
