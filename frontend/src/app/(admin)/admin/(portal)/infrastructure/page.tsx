import {AdminPage} from '@/components/layout/AdminPage';
import {InfrastructureOverview} from '@/features/infrastructure/components/InfrastructureOverview';

export default function Page() {
    return <AdminPage title="adminInfra.pages.overview" permission="PERMISSION_MANAGE" activeResource="infrastructure">
        <InfrastructureOverview/>
    </AdminPage>;
}
