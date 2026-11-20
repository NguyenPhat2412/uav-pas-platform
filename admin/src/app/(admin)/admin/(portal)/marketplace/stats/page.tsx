import {AdminPage} from '@/components/layout/AdminPage';
import {AdminMarketplaceStats} from '@/components/marketplace/AdminMarketplaceStats';

export default function AdminMarketplaceStatsPage() {
    return (
        <AdminPage
            title="adminCommerce.marketplace.stats.pageTitle"
            permission="MARKETPLACE_MODERATE"
            activeResource="/admin/marketplace/stats"
        >
            <AdminMarketplaceStats/>
        </AdminPage>
    );
}
