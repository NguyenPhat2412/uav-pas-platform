import {AdminPage} from '@/components/layout/AdminPage';
import {AdminFleetMapPanel} from "@/components/uav/AdminFleetMapPanel";

export default function Page() {
    return <AdminPage title="admin.pages.fleetMap.title" permission="MISSION_VIEW_ALL" activeResource="fleet-map">
        <AdminFleetMapPanel/>
    </AdminPage>;
}
