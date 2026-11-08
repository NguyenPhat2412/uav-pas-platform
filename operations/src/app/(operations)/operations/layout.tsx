import {PortalProviders} from '@/providers/PortalProviders';

export const metadata = {title: 'UAV PAS · Vận hành', description: 'Điều phối và thực hiện nhiệm vụ UAV'};

export default function OperationsLayout({children}: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <PortalProviders area="operations">{children}</PortalProviders>
        </div>
    );
}
