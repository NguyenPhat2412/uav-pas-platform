import {AdminPage} from '@/components/layout/AdminPage';
import {AdminFileManager} from '@/components/storage/files/AdminFileManager';

export default function Page() {
    return <AdminPage title="admin.files.title" permission="USER_PERMISSION_MANAGE" activeResource="files">
        <AdminFileManager/>
    </AdminPage>;
}
