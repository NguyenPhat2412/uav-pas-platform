'use client';
import {AdminPage} from '@/components/layout/AdminPage';
import {UavPanel} from '@/components/uav/UavPanel';

export default function AdminUavsPage() {
    return <AdminPage title="adminNav.uavs" permission="UAV_VIEW" activeResource="uavs">
        <UavPanel/>
    </AdminPage>;
}
