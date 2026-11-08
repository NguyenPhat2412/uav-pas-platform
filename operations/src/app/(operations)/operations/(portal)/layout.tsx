import {OperationsPortalFrame} from '@/components/layout/OperationsPage';

// One shell for every operations page, so the sidebar, header and assistant stay put between pages.
export default function OperationsPortalLayout({children}: { children: React.ReactNode }) {
    return <OperationsPortalFrame>{children}</OperationsPortalFrame>;
}
