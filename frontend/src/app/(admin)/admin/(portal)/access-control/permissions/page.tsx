import {AdminPage} from '@/components/layout/AdminPage';
import {AccessHub} from "@/features/access/components/AccessHub";

export default function AdminAccessPermissionsRegistryPage() {
    return <AdminPage title="admin.pages.access.title"
                      permission="PERMISSION_MANAGE" activeResource="access-control"><AccessHub tab="registry"/></AdminPage>;
}
