import {AdminPage} from '@/components/layout/AdminPage';
import {Dashboard} from "@/components/dashboard/overview/AdminDashboard";
import {AdminAnalytics} from "@/components/dashboard/analytics/AdminAnalytics";
import {AdminHome} from "@/components/dashboard/overview/AdminHome";

export default function Page() {
    return <AdminPage title="admin.pages.dashboard.title"
                      permission="DASHBOARD_VIEW" activeResource="dashboard">
        <div className="space-y-8"><AdminHome/><AdminAnalytics/><Dashboard/></div>
    </AdminPage>;
}
