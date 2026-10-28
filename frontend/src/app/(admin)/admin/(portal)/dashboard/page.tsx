import {AdminPage} from '@/components/layout/AdminPage';
import {Dashboard} from "@/features/dashboard/components/AdminDashboard";
import {AdminAnalytics} from "@/features/dashboard/components/AdminAnalytics";
import {AdminHome} from "@/features/dashboard/components/AdminHome";

export default function Page() {
    return <AdminPage title="admin.pages.dashboard.title"
                      permission="DASHBOARD_READ" activeResource="dashboard">
        <div className="space-y-8"><AdminHome/><AdminAnalytics/><Dashboard/></div>
    </AdminPage>;
}
