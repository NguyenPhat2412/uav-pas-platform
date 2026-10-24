import {PortalProviders} from '@/providers/PortalProviders';

export const metadata = {title: 'UAV PAS · Quản trị', description: 'Quản lý người dùng và quyền truy cập UAV PAS'};

export default function AdminLayout({children}: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <PortalProviders area="admin">{children}</PortalProviders>
        </div>
    );
}
