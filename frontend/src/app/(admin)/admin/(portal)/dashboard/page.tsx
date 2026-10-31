import {AdminPage} from '@/components/layout/AdminPage';
import {Dashboard} from "@/components/dashboard/AdminDashboard";
import {AdminAnalytics} from "@/components/dashboard/AdminAnalytics";
import {AdminHome} from "@/components/dashboard/AdminHome";

export default function Page() {
    return <AdminPage title="admin.pages.dashboard.title"
                      permission="DASHBOARD_READ" activeResource="dashboard">
        <div className="space-y-8"><AdminHome/><AdminAnalytics/><Dashboard/></div>
    </AdminPage>;
}
