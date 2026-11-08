'use client';

import {AdminPage} from '@/components/layout/AdminPage';
import {TrainingAcademyWorkspace} from '@/components/training/TrainingAcademyWorkspace';

export default function AdminTrainingOperationsRoutePage() {
    return (
        <AdminPage
            title="SOP Điều hành & Giám sát"
            permission="DASHBOARD_VIEW"
            activeResource="/admin/training/operations"
        >
            <TrainingAcademyWorkspace defaultPortal="OPERATIONS" manage />
        </AdminPage>
    );
}
