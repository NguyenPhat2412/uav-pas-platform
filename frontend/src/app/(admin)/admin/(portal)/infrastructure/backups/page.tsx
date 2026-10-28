import {AdminPage} from '@/components/layout/AdminPage';
import {BackupsPanel} from '@/features/infrastructure/components/BackupsPanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.backups" permission="PERMISSION_MANAGE" activeResource="infrastructureBackups">
        <BackupsPanel/>
    </AdminPage>;
}
