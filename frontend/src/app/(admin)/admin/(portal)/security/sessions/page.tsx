import {AdminPage} from '@/components/layout/AdminPage';
import {SecuritySessionsPanel} from '@/components/security/SecuritySessionsPanel';

export default function Page() {
    return <AdminPage title="adminSecurity.pages.sessions" permission="PERMISSION_MANAGE" activeResource="securitySessions">
        <SecuritySessionsPanel/>
    </AdminPage>;
}
