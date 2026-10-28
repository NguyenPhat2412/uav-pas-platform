import {AdminPage} from '@/components/layout/AdminPage';
import {EmailPanel} from '@/features/infrastructure/components/EmailPanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.email" permission="PERMISSION_MANAGE" activeResource="infrastructureEmail">
        <EmailPanel/>
    </AdminPage>;
}
