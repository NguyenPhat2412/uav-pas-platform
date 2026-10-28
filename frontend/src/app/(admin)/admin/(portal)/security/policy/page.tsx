import {AdminPage} from '@/components/layout/AdminPage';
import {SecurityPolicyPanel} from '@/features/security/components/SecurityPolicyPanel';

export default function Page() {
    return <AdminPage title="adminSecurity.pages.policy" permission="PERMISSION_MANAGE" activeResource="securityPolicy">
        <SecurityPolicyPanel/>
    </AdminPage>;
}
