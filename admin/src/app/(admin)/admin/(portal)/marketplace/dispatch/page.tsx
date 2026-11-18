import {AdminPage} from '@/components/layout/AdminPage';
import {AdminMarketplaceDispatch} from '@/components/marketplace/AdminMarketplaceDispatch';

export default function AdminMarketplaceDispatchPage() {
    return (
        <AdminPage
            title="adminCommerce.marketplace.dispatch.pageTitle"
            permission="MARKETPLACE_MODERATE"
            activeResource="/admin/marketplace/dispatch"
        >
            <AdminMarketplaceDispatch/>
        </AdminPage>
    );
}
