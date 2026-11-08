import {AdminPage} from '@/components/layout/AdminPage';
import {BackupsPanel} from '@/components/infrastructure/BackupsPanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.backups" permission="USER_PERMISSION_MANAGE" activeResource="infrastructureBackups">
        <BackupsPanel/>
    </AdminPage>;
}
