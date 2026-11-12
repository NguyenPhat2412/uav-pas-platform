import {CustomerPortalFrame} from '@/components/customer/CustomerLayout';

// One shell for every customer page, so the sidebar, header and assistant stay put between pages.
export default function CustomerPortalLayout({children}: { children: React.ReactNode }) {
    return <CustomerPortalFrame>{children}</CustomerPortalFrame>;
}
