import {AdminPage} from '@/components/layout/AdminPage';
import {AdminFleetMapPanel} from "@/features/uavs/components/AdminFleetMapPanel";

export default function Page() {
    return <AdminPage title="admin.pages.fleetMap.title" permission="UAV_READ" activeResource="fleet-map">
        <AdminFleetMapPanel/>
    </AdminPage>;
}
