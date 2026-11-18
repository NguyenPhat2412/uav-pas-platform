import CustomerDashboardPanel from '@/components/dashboard/CustomerDashboardPanel';
import {CustomerHome} from '@/components/dashboard/CustomerHome';

export default function CustomerAnalyticsDetailRoutePage() {
    return (
        <>
            <CustomerHome/>
            <CustomerDashboardPanel/>
        </>
    );
}
