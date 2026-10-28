'use client';

import {AdminPage} from '@/components/layout/AdminPage';
import {TrainingAcademyWorkspace} from '@/features/training/components/TrainingAcademyWorkspace';

export default function AdminTrainingOperationsRoutePage() {
    return (
        <AdminPage
            title="SOP Điều hành & Tác chiến"
            permission="DASHBOARD_READ"
            activeResource="/admin/training/operations"
        >
            <TrainingAcademyWorkspace defaultPortal="OPERATIONS" manage />
        </AdminPage>
    );
}
