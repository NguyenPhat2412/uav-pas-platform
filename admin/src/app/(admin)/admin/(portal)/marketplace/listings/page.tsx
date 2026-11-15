import {AdminPage} from '@/components/layout/AdminPage';
import {AdminMarketplaceListings} from '@/components/marketplace/AdminMarketplaceListings';

export default function AdminMarketplaceListingsPage() {
    return (
        <AdminPage
            title="Kiểm duyệt tin đăng"
            permission="MARKETPLACE_MODERATE"
            activeResource="/admin/marketplace/listings"
        >
            <AdminMarketplaceListings/>
        </AdminPage>
    );
}
