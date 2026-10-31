import {AdminPage} from '@/components/layout/AdminPage';
import {StoragePanel} from '@/components/infrastructure/StoragePanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.storage" permission="PERMISSION_MANAGE" activeResource="infrastructureStorage">
        <StoragePanel/>
    </AdminPage>;
}
