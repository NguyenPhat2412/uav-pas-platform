'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui';
const nav = [
  { icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', href: '/dashboard', label: 'Tổng quan', permission: 'MISSION_VIEW' },
  { icon: 'M3 9l9-6 9 6v12H3z M9 21v-8h6v8', href: '/services', label: 'Dịch vụ UAV', permission: 'MISSION_VIEW' },
  { icon: 'M8 4H5v17h14V4h-3 M9 2h6v5H9z M8 12h8 M8 16h6', href: '/missions', label: 'Nhiệm vụ của tôi', permission: 'MISSION_VIEW' },
  { icon: 'M20 21v-2a8 8 0 0 0-16 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0', href: '/profile', label: 'Tài khoản' },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const { user, logout, can, permissionsReady } = useAuth();
  return <div className="customer-shell"><a href="#content" className="skip-link">Bỏ qua tới nội dung</a>
    <aside className="sidebar"><Link href="/dashboard" className="brand"><b>UAV PAS</b><small>Cổng khách hàng</small></Link>
      <nav aria-label="Điều hướng khách hàng">{nav.filter(item => !item.permission || (permissionsReady && can(item.permission))).map(({ href, label, icon }) => <Link key={href} href={href} aria-label={label} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon}/></svg><span className="nav-label-full">{label}</span><span className="nav-label-short" aria-hidden="true">{href === "/missions" ? "Nhiệm vụ" : href === "/services" ? "Dịch vụ" : label}</span></Link>)}</nav>
      <button className="logout" onClick={() => void logout()}>Đăng xuất</button>
    </aside><div className="customer-workspace"><header className="topbar"><span>Cổng khách hàng</span><Link href="/profile" className="account">{user?.fullName || user?.username}</Link></header><main id="content" className="customer-main">{children}</main></div>
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
