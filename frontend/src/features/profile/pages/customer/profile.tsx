'use client';
import { PageGuard } from "@/components/customer/layout";
import { CustomerProfilePage } from "@/features/profile/components/Profile";
export default function ProfilePage() {
  return <PageGuard permission={null}><CustomerProfilePage /></PageGuard>;
}
