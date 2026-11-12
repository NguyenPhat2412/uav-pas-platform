import {AdminPage} from '@/components/layout/AdminPage';
import {DatabasePanel} from '@/components/infrastructure/DatabasePanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.database" permission="USER_PERMISSION_MANAGE" activeResource="infrastructureDatabase">
        <DatabasePanel/>
    </AdminPage>;
}
