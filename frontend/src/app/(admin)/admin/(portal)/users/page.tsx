import {AdminPage} from '@/components/layout/AdminPage';
import {Users} from "@/components/user/Users";

export default function Page() {
    return <AdminPage title="admin.pages.users.title" permission="USER_READ"
                      activeResource="users"><Users/></AdminPage>;
}
