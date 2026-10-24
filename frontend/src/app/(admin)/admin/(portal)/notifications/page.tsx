import {AdminPage} from '@/components/layout/AdminPage';
import {AdminNotificationsPanel} from "@/features/notifications/components/AdminNotificationsPanel";

export default function Page() {
    return <AdminPage title="admin.pages.notifications.title" permission="DASHBOARD_READ" activeResource="notifications">
        <AdminNotificationsPanel/>
    </AdminPage>;
}
