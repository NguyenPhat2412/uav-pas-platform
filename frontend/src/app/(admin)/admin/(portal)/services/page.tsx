import {AdminPage} from '@/components/layout/AdminPage';
import {AdminServicesPanel} from "@/features/catalog/components/AdminServicesPanel";

export default function Page() {
    return <AdminPage title="admin.pages.services.title" permission="MISSION_CONFIRM" activeResource="services">
        <AdminServicesPanel/>
    </AdminPage>;
}
