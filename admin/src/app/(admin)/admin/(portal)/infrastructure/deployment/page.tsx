import {AdminPage} from '@/components/layout/AdminPage';
import {DeploymentPanel} from '@/components/infrastructure/runtime/DeploymentPanel';

export default function Page() {
    return <AdminPage title="adminInfra.pages.deployment" permission="USER_PERMISSION_MANAGE" activeResource="infrastructureDeployment">
        <DeploymentPanel/>
    </AdminPage>;
}
