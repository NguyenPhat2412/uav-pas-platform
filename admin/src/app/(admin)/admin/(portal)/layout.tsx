import {AdminPortalFrame} from '@/components/layout/AdminPage';

// One shell for every admin page, so the sidebar, header and assistant stay put between pages.
export default function AdminPortalLayout({children}: { children: React.ReactNode }) {
    return <AdminPortalFrame>{children}</AdminPortalFrame>;
}
