'use client';
import { PageGuard } from '@/components/layout';
import { CustomerProfilePage } from '@/features/customer/Profile';
export default function ProfilePage() {
  return <PageGuard permission={null}><CustomerProfilePage /></PageGuard>;
}
