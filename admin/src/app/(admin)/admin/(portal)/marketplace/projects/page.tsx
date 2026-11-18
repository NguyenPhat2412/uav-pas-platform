import {AdminPage} from '@/components/layout/AdminPage';
import {AdminMarketplaceProjects} from '@/components/marketplace/AdminMarketplaceProjects';

export default function AdminMarketplaceProjectsPage() {
    return (
        <AdminPage
            title="adminCommerce.marketplace.projects.pageTitle"
            permission="MARKETPLACE_MODERATE"
            activeResource="/admin/marketplace/projects"
        >
            <AdminMarketplaceProjects/>
        </AdminPage>
    );
}
