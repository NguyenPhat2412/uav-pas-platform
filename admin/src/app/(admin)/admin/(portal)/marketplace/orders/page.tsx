import {AdminPage} from '@/components/layout/AdminPage';
import {AdminMarketplaceOrders} from '@/components/marketplace/AdminMarketplaceOrders';

export default function AdminMarketplaceOrdersPage() {
    return (
        <AdminPage
            title="adminCommerce.marketplace.orders.pageTitle"
            permission="MARKETPLACE_MODERATE"
            activeResource="/admin/marketplace/orders"
        >
            <AdminMarketplaceOrders/>
        </AdminPage>
    );
}
