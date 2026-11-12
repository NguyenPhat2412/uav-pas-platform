import {AdminPage} from '@/components/layout/AdminPage';
import {SupportInboxWorkspace} from '@/components/support/SupportInboxWorkspace';

export default function AdminSupportInboxPage() {
    return (
        <AdminPage
            title="admin.pages.support.title"
            permission="DASHBOARD_VIEW"
            activeResource="support"
        >
            <SupportInboxWorkspace/>
        </AdminPage>
    );
}
