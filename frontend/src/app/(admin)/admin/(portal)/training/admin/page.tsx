'use client';

import {AdminPage} from '@/components/layout/AdminPage';
import {TrainingAcademyWorkspace} from '@/features/training/components/TrainingAcademyWorkspace';

export default function AdminTrainingGovernanceRoutePage() {
    return (
        <AdminPage
            title="Quy chuẩn Quản trị & Bảo mật"
            permission="DASHBOARD_READ"
            activeResource="/admin/training/admin"
        >
            <TrainingAcademyWorkspace defaultPortal="ADMIN" manage />
        </AdminPage>
    );
}
