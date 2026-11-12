import {PortalProviders} from '@/providers/PortalProviders';

export const metadata = {title: 'UAV PAS · Tài khoản', description: 'Đặt và theo dõi dịch vụ UAV'};

export default function CustomerLayout({children}: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <PortalProviders area="customer">{children}</PortalProviders>
        </div>
    );
}
