import {AdminPage} from '@/components/layout/AdminPage';
import {AdminSystemHealthPanel} from "@/features/settings/components/AdminSystemHealthPanel";

export default function Page() {
    return <AdminPage title="admin.pages.systemHealth.title" permission="PERMISSION_MANAGE" activeResource="system-health">
        <AdminSystemHealthPanel/>
    </AdminPage>;
}
