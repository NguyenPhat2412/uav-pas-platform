import "@/styles/styles.css";
import "@/styles/operations/globals.css";
import "@/styles/portal.css";
import "@/styles/consistency.css";
import {PortalProviders} from '@/providers/PortalProviders';

export const metadata = {title: 'UAV PAS · Vận hành', description: 'Điều phối và thực hiện nhiệm vụ UAV'};

export default function Layout({children}: { children: React.ReactNode }) {
    return <html lang="vi">
    <body className="uav-portal"><PortalProviders area="operations">{children}</PortalProviders></body>
    </html>;
}
