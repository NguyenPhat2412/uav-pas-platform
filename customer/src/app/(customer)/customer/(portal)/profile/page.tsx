'use client';
import {PageGuard} from "@/components/customer/CustomerLayout";
import {CustomerProfilePage} from "@/components/profile/Profile";

export default function ProfilePage() {
    return <PageGuard permission={null}><CustomerProfilePage/></PageGuard>;
}
