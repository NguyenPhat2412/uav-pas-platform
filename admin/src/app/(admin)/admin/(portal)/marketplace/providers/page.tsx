import {AdminPage} from '@/components/layout/AdminPage';
import {AdminMarketplaceProviders} from '@/components/marketplace/AdminMarketplaceProviders';

export default function AdminMarketplaceProvidersPage() {
    return (
        <AdminPage
            title="Duyệt đối tác KYC"
            permission="MARKETPLACE_MODERATE"
            activeResource="/admin/marketplace/providers"
        >
            <AdminMarketplaceProviders/>
        </AdminPage>
    );
}
