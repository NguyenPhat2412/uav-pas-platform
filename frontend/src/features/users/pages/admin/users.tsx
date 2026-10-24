import {AdminPage} from '@/components/layout/AdminPage';
import {Users} from "@/features/users/components/Users";

export default function Page() {
    return <AdminPage title="admin.pages.users.title" meta="admin.pages.users.meta" permission="USER_READ"
                      activeResource="users"><Users/></AdminPage>;
}
