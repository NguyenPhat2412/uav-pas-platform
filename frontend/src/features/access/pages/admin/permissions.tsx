import {AdminPage} from '@/components/layout/AdminPage';
import {AccessHub} from "@/features/access/components/AccessHub";

export default function Page() {
    return <AdminPage title="admin.pages.access.title" meta="admin.pages.access.registryMeta"
                      permission="PERMISSION_MANAGE" activeResource="access-control"><AccessHub tab="registry"/></AdminPage>;
}
