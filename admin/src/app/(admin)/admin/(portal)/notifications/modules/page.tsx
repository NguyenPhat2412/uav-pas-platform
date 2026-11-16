import {AdminPage} from '@/components/layout/AdminPage';
import {NotificationModulesAdminPanel} from '@/components/notification/policy/NotificationModulesAdminPanel';

export default function AdminNotificationModulesPage() {
    return (
        <AdminPage
            title="adminNav.notificationModules"
            permission="DASHBOARD_VIEW"
            activeResource="notificationModules"
        >
            <NotificationModulesAdminPanel/>
        </AdminPage>
    );
}
