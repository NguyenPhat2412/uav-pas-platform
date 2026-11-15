import {AdminPage} from '@/components/layout/AdminPage';
import {AdminMarketplacePayouts} from '@/components/marketplace/AdminMarketplacePayouts';

export default function AdminMarketplacePayoutsPage() {
    return (
        <AdminPage
            title="Giải ngân đối tác"
            permission="PAYOUT_MANAGE"
            activeResource="/admin/billing/payouts"
        >
            <AdminMarketplacePayouts/>
        </AdminPage>
    );
}
