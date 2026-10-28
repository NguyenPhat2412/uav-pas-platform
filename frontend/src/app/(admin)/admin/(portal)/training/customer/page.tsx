'use client';

import {AdminPage} from '@/components/layout/AdminPage';
import {TrainingAcademyWorkspace} from '@/features/training/components/TrainingAcademyWorkspace';

export default function AdminTrainingCustomerRoutePage() {
    return (
        <AdminPage
            title="Đào tạo Cổng Khách hàng"
            permission="DASHBOARD_READ"
            activeResource="/admin/training/customer"
        >
            <TrainingAcademyWorkspace defaultPortal="CUSTOMER" manage />
        </AdminPage>
    );
}
