import {AdminPage} from '@/components/layout/AdminPage';
import {SecuritySecretsPanel} from '@/components/security/SecuritySecretsPanel';

export default function Page() {
    return <AdminPage title="adminSecurity.pages.secrets" permission="USER_PERMISSION_MANAGE" activeResource="securitySecrets">
        <SecuritySecretsPanel/>
    </AdminPage>;
}
