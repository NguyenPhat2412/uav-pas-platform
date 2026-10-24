import {AdminPage} from '@/components/layout/AdminPage';
import {Users} from "@/features/users/components/Users";

export default function Page() {
    return <AdminPage title="admin.pages.users.title" permission="USER_READ"
                      activeResource="users"><Users/></AdminPage>;
}
