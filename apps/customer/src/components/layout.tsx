'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui';
const nav = [
  { href: '/dashboard', label: 'Tổng quan', permission: 'MISSION_VIEW' },
  { href: '/services', label: 'Dịch vụ UAV', permission: 'MISSION_VIEW' },
  { href: '/missions', label: 'Mission của tôi', permission: 'MISSION_VIEW' },
  { href: '/profile', label: 'Tài khoản' },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const { user, logout, can, permissionsReady } = useAuth();
  return <div className="customer-shell"><a href="#content" className="skip-link">Bỏ qua tới nội dung</a>
    <aside className="sidebar"><Link href="/dashboard" className="brand"><b>UAV PAS</b><small>Customer Portal</small></Link>
      <nav aria-label="Điều hướng khách hàng">{nav.filter(item => !item.permission || (permissionsReady && can(item.permission))).map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}>{label}</Link>)}</nav>
      <button className="logout" onClick={() => void logout()}>Đăng xuất</button>
    </aside><div className="customer-workspace"><header className="topbar"><span>Customer Portal</span><Link href="/profile" className="account">{user?.fullName || user?.username}</Link></header><main id="content" className="customer-main">{children}</main></div>
  </div>;
}
export function PageGuard({ children, permission = 'MISSION_VIEW' }: { children: React.ReactNode; permission?: string | null }) {
  const router = useRouter(); const { isAuthenticated, isLoading, permissionsReady, permissionError, refreshPermissions, can } = useAuth();
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login'); }, [router, isLoading, isAuthenticated]);
  if (isLoading || !isAuthenticated) return <div className="center-state" role="status">Đang xác thực…</div>;
  return <AppShell>{permission && permissionError ? <div className="error" role="alert">Không thể kiểm tra quyền truy cập. <Button onClick={() => void refreshPermissions()}>Thử lại</Button></div>
    : permission && !permissionsReady ? <div role="status">Đang kiểm tra quyền…</div>
    : permission && !can(permission) ? <div className="notice" role="alert">Tài khoản chưa được cấp quyền cho chức năng này.</div> : children}</AppShell>;
}
