import {AdminPage} from '@/components/layout/AdminPage';
import {AdminNotificationsPanel} from "@/components/notification/AdminNotificationsPanel";

export default function Page() {
    return <AdminPage title="admin.pages.notifications.title" permission="DASHBOARD_READ" activeResource="notifications">
        <AdminNotificationsPanel/>
    </AdminPage>;
}
