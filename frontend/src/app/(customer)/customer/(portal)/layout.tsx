import {CustomerPortalFrame} from '@/components/customer/layout';

// One shell for every customer page, so the sidebar, header and assistant stay put between pages.
export default function CustomerPortalLayout({children}: { children: React.ReactNode }) {
    return <CustomerPortalFrame>{children}</CustomerPortalFrame>;
}
