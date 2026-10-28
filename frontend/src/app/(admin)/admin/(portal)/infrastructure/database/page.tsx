import {AdminPage} from '@/components/layout/AdminPage';
import {DatabasePanel} from '@/features/infrastructure/components/DatabasePanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.database" permission="PERMISSION_MANAGE" activeResource="infrastructureDatabase">
        <DatabasePanel/>
    </AdminPage>;
}
