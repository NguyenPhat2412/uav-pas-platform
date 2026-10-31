import {AdminPage} from '@/components/layout/AdminPage';
import {AdminServicesPanel} from "@/components/catalog/AdminServicesPanel";

export default function Page() {
    return <AdminPage title="admin.pages.services.title" permission="MISSION_CONFIRM" activeResource="services">
        <AdminServicesPanel/>
    </AdminPage>;
}
