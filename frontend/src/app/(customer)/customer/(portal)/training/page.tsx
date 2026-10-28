'use client';

import {PageGuard} from '@/components/customer/layout';
import {TrainingAcademyWorkspace} from '@/features/training/components/TrainingAcademyWorkspace';

export default function CustomerTrainingRoutePage() {
    return (
        <PageGuard permission={null}>
            <TrainingAcademyWorkspace defaultPortal="CUSTOMER" />
        </PageGuard>
    );
}
