import {AdminPage} from '@/components/layout/AdminPage';
import {DeploymentPanel} from '@/components/infrastructure/DeploymentPanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.deployment" permission="PERMISSION_MANAGE" activeResource="infrastructureDeployment">
        <DeploymentPanel/>
    </AdminPage>;
}
