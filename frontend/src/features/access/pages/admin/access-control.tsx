import {AdminPage} from '@/components/layout/AdminPage';
import {AccessHub} from "@/features/access/components/AccessHub";

export default function Page() {
    return <AdminPage title="admin.pages.access.title" meta="admin.pages.access.accountsMeta"
                      permission="PERMISSION_MANAGE" activeResource="access-control"><AccessHub tab="accounts"/></AdminPage>;
}
