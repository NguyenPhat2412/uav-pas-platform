import {AdminPage} from '@/components/layout/AdminPage';
import {SecuritySecretsPanel} from '@/features/security/components/SecuritySecretsPanel';

export default function Page() {
    return <AdminPage title="adminSecurity.pages.secrets" permission="PERMISSION_MANAGE" activeResource="securitySecrets">
        <SecuritySecretsPanel/>
    </AdminPage>;
}
