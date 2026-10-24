import {AdminPage} from '@/components/layout/AdminPage';
import {Dashboard} from "@/features/dashboard/components/AdminDashboard";
import {AdminAnalytics} from "@/features/dashboard/components/AdminAnalytics";

export default function Page() {
    return <AdminPage title="admin.pages.dashboard.title"
                      meta="admin.pages.dashboard.meta"
                      permission="DASHBOARD_READ" activeResource="dashboard">
        <div className="space-y-8"><AdminAnalytics/><Dashboard/></div>
    </AdminPage>;
}
