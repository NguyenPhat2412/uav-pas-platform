import {AdminPage} from '@/components/layout/AdminPage';
import {DeploymentPanel} from '@/features/infrastructure/components/DeploymentPanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.deployment" permission="PERMISSION_MANAGE" activeResource="infrastructureDeployment">
        <DeploymentPanel/>
    </AdminPage>;
}
