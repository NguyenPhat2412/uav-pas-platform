import {AdminPage} from '@/components/layout/AdminPage';
import {UserDetail} from "@/features/users/components/Users";
import {parseEntityId} from "@/lib/url-slugs";

export default async function Page({params}: { params: Promise<{ id: string }> }) {
    const {id} = await params;
    return <AdminPage title="admin.pages.userDetail.title"
                      permission="USER_READ" activeResource="users"><UserDetail id={parseEntityId(id)}/></AdminPage>;
}
