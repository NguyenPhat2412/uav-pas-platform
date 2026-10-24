import "@/styles/styles.css";
import "@/styles/admin/globals.css";
import "@/styles/portal.css";
import "@/styles/consistency.css";
import "@/styles/admin/console.css";
import {PortalProviders} from '@/providers/PortalProviders';

export const metadata = {title: 'UAV PAS · Quản trị', description: 'Quản lý người dùng và quyền truy cập UAV PAS'};

export default function Layout({children}: { children: React.ReactNode }) {
    return <html lang="vi">
    <body className="uav-portal"><PortalProviders area="admin">{children}</PortalProviders></body>
    </html>;
}
