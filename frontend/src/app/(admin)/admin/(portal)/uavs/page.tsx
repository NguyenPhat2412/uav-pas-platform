'use client';
import {AdminPage} from '@/components/layout/AdminPage';
import {UavPanel} from '@/features/uavs/components/UavPanel';

export default function AdminUavsPage() {
    return <AdminPage title="adminNav.uavs" permission="UAV_READ" activeResource="uavs">
        <UavPanel/>
    </AdminPage>;
}
