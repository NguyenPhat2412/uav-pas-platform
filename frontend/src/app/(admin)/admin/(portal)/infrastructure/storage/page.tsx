import {AdminPage} from '@/components/layout/AdminPage';
import {StoragePanel} from '@/features/infrastructure/components/StoragePanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.storage" permission="PERMISSION_MANAGE" activeResource="infrastructureStorage">
        <StoragePanel/>
    </AdminPage>;
}
