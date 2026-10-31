import {AdminPage} from '@/components/layout/AdminPage';
import {EmailPanel} from '@/components/infrastructure/EmailPanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.email" permission="PERMISSION_MANAGE" activeResource="infrastructureEmail">
        <EmailPanel/>
    </AdminPage>;
}
