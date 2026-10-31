import {AdminPage} from '@/components/layout/AdminPage';
import {SecurityPolicyPanel} from '@/components/security/SecurityPolicyPanel';

export default function Page() {
    return <AdminPage title="adminSecurity.pages.policy" permission="PERMISSION_MANAGE" activeResource="securityPolicy">
        <SecurityPolicyPanel/>
    </AdminPage>;
}
