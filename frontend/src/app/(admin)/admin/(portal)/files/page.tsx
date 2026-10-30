import {AdminPage} from '@/components/layout/AdminPage';
import {AdminFileManager} from '@/features/files/components/AdminFileManager';

export default function Page() {
    return <AdminPage title="admin.files.title" permission="PERMISSION_MANAGE" activeResource="files">
        <AdminFileManager/>
    </AdminPage>;
}
