import {AdminPage} from '@/components/layout/AdminPage';
import {AdminProfilePanel} from "@/features/profile/components/AdminProfilePanel";

export default function Page() {
    return <AdminPage title="admin.pages.profile.title" permission="DASHBOARD_READ" activeResource="profile">
        <AdminProfilePanel/>
    </AdminPage>;
}
